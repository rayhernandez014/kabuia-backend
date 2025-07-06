const contractRouter = require('express').Router()
const Contract = require('../models/contract')
const { userExtractor, contractValidator, roleValidator } = require('../utils/middleware')
const Buyer = require('../models/buyer')
const ContractWithPickup = require('../models/contractWithPickup')
const ContractWithDelivery = require('../models/contractWithDelivery')
const Seller = require('../models/seller')
const Product = require('../models/product')
const mongoose = require('mongoose')

contractRouter.get('/', userExtractor, async (request, response) => {
  const contracts = await Contract.find({ $or: [{buyer: request.user}, {seller: request.user}, {deliverer: request.user}]}).exec()
  response.json(contracts)
})

contractRouter.post('/', userExtractor, roleValidator(['buyer']), async (request, response) => {
  const { sellerId, expectedReadyDate, contractType, pickupLocation, deliveryLocation } = request.body
  
  const session = await mongoose.startSession()
  request.session.mongoSession = session
  session.startTransaction()

  const seller = await Seller.findById({id: sellerId}).session(session).exec()

  if (!seller) {
    await session.abortTransaction();
    session.endSession();
    return response.status(403).json({
      error: 'seller is invalid'
    })
  }

  const buyer = request.user

  //verifying availability

  buyer.shoppingCart.items.forEach( async (item, idx) => {
    const product = await Product.findById({id: item}).session(session).exec()
    if(!product || product?.stock < buyer.shoppingCart.quantities[idx]){
      await session.abortTransaction();
      session.endSession();
      return response.status(400).json({
        error: 'this product is out of stock or does not exist',
        productId: item
      })
    }
  })

  const orderTotal = buyer.shoppingCart.items.reduce((accumulator, currentValue, idx) => accumulator + (currentValue * buyer.shoppingCart.quantities[idx]), 0)

  const order = {
    ...buyer.shoppingCart,
    total: orderTotal
  }

  let contract = null  
  
  if(contractType === 'ContractWithPickup'){

    if(!seller.locations.includes(pickupLocation)){
      await session.abortTransaction();
      session.endSession();
      return response.status(400).json({
        error: 'this location is not valid'
      })
    }

    contract = new ContractWithPickup({
      buyer: buyer._id,
      seller: seller, 
      order: order, 
      history: {
        status: 'placed',
        timestamp: new Date()
      },
      expectedReadyDate: expectedReadyDate,
      pickupLocation: pickupLocation
    })
  }

  else if(contractType === 'ContractWithDelivery'){

    if(!buyer.locations.includes(deliveryLocation)){
      await session.abortTransaction();
      session.endSession();
      return response.status(400).json({
        error: 'this location is not valid'
      })
    }

    contract = new ContractWithDelivery({
      buyer: buyer._id,
      seller: seller, 
      products: order,
      history: {
        status: 'placed',
        timestamp: new Date()
      },
      expectedReadyDate: expectedReadyDate,
      deliveryLocation: deliveryLocation
    })
  }

  if(!contract){
    await session.abortTransaction();
    session.endSession();
    return response.status(400).json({
      error: 'contract type is invalid'
    })
  }

  //paying

  buyer.shoppingCart.items.forEach( async (item, idx) => {
    await Product.findByIdAndUpdate(item, { $inc: { stock: -buyer.shoppingCart.quantities[idx] } }, {
      new: true,
      runValidators: true,
      context: 'query'
    }).session(session).exec()
  })

  const savedContract = await contract.save({ session }).exec()  
  
  buyer.shoppingCart = {
    items: [],
    quantities: []
  }

  const updatedBuyer = await buyer.save({ session }).exec()

  await session.commitTransaction()
  session.endSession()
  request.session.mongoSession = null

  response.status(201).json({savedContract})

})
/*
productsRouter.delete( '/:id', userExtractor, productValidator, async (request, response) => {

  await Product.findByIdAndRemove(request.params.id).exec()

  const newSellerData = {
    catalog: [...request.user.catalog].filter((p) => p.toString() !== request.params.id)
  }

  await Seller.findByIdAndUpdate(request.user._id, newSellerData, {
    new: true,
    runValidators: true,
    context: 'query'
  }).exec()

  response.status(204).end()

})
*/
/*
contractRouter.put('/updateDetails/:id', userExtractor, contractValidator, async (request, response) => {
  const { products, expectedReadyDate } = request.body

  const statusHistory = request.contract.statusHistory

  if (request.user.type !== 'buyer') {
    return response.status(403).json({
      error: 'user must be a buyer'
    })
  }

  if(statusHistory.length !== 1 || statusHistory[0] !== 'placed'){
    return response.status(400).json({
      error: 'the order is already being prepared'
    })
  }

  const receivedContract = {
    products: products,
    expectedReadyDate: expectedReadyDate
  }

  const updatedContract = await Contract.findByIdAndUpdate(request.params.id, receivedContract , {
    new: true,
    runValidators: true,
    context: 'query'
  }).exec()

  response.json(updatedContract)

})
*/

contractRouter.put('/updateStatus/:id', userExtractor, contractValidator, async (request, response) => {
  const { newStatus } = request.body

  const history = request.contract.history

  const validTransitions = {
    placed: [
      {
        to: 'preparing',
        by: ['seller'],
        orderTypes: ['ContractWithDelivery', 'ContractWithPickup']
      },
      {
        to: 'canceled',
        by: ['seller', 'buyer'],
        orderTypes: ['ContractWithDelivery', 'ContractWithPickup']
      }
    ],
    preparing: [
      {
        to: 'ready',
        by: ['seller'],
        orderTypes: ['ContractWithDelivery', 'ContractWithPickup']
      },
    ],
    ready: [
      {
        to: 'delivering',
        by: ['deliverer'],
        orderTypes: ['ContractWithDelivery']
      },
      {
        to: 'picked-up',
        by: ['buyer'],
        orderTypes: ['ContractWithPickup']
      },
    ],
    delivering: [
      {
        to: 'delivered',
        by: ['buyer'],
        orderTypes: ['ContractWithDelivery']
      },
    ]
  }

  const validOptions = validTransitions[history.at(-1).status]

  const isValidStatus = validOptions.some((o) => {
    return newStatus === o.to
  })

  const isValidRole = validOptions.some((o) => {
    return o.by.includes(request.user.type)
  })

  const isValidOrderType = validOptions.some((o) => {
    return o.orderTypes.includes(request.contract.type)
  })

  if(!isValidStatus || !isValidRole || !isValidOrderType){
    return response.status(400).json({
      error: 'this new status, user role or order type is not compatible with the order'
    })
  }

  //for delivering and picking up, apply payments to seller and deliverer (in contracts with delivering)

  let updatedContract;

  if(newStatus === 'canceled'){

    const session = await mongoose.startSession()
    request.session.mongoSession = session
    session.startTransaction()

    const buyer = await Buyer.findById( request.contract.buyer ).session(session).exec()

    buyer.shoppingCart.items.forEach( async (item, idx) => {
      await Product.findByIdAndUpdate(item, { $inc: { stock: +buyer.shoppingCart.quantities[idx] } }, {
        new: true,
        runValidators: true,
        context: 'query'
      }).session(session).exec()
    })

    updatedContract = await Contract.findByIdAndUpdate(request.params.id, {
      $push: { history: {
          status: newStatus,
          timestamp: new Date()
        } 
      }
    } , {
      new: true,
      runValidators: true,
      context: 'query'
    }).session(session).exec()

    await session.commitTransaction()
    session.endSession()
    request.session.mongoSession = null

  }
  else{
    updatedContract = await Contract.findByIdAndUpdate(request.params.id, {
      $push: { history: {
          status: newStatus,
          timestamp: new Date()
        } 
      }
    } , {
      new: true,
      runValidators: true,
      context: 'query'
    }).exec()
  }

  response.json(updatedContract)

})

module.exports = contractRouter
