const contractsRouter = require('express').Router()
const Contract = require('../models/contract')
const { userExtractor, contractValidator, roleValidator } = require('../utils/middleware')
const Buyer = require('../models/buyer')
const ContractWithPickup = require('../models/contractWithPickup')
const ContractWithDelivery = require('../models/contractWithDelivery')
const Seller = require('../models/seller')
const Product = require('../models/product')
const mongoose = require('mongoose')

contractsRouter.get('/', userExtractor, async (request, response) => {
  const contracts = await Contract.find({ $or: [{buyer: request.user}, {seller: request.user}, {deliverer: request.user}]}).exec()
  response.json(contracts)
})

contractsRouter.post('/', userExtractor, roleValidator(['Buyer']), async (request, response) => {
  const { sellerId, expectedReadyDate, contractType, pickupLocation, deliveryLocation } = request.body
  
  const session = await mongoose.startSession()
  session.startTransaction()
  request.mongoSession = session

  const seller = await Seller.findById(sellerId).session(session).exec()

  if (!seller) {
    throw new Error('seller is invalid', { cause: { title: 'UserError', code: 403} })
  }

  const buyer = request.user

  //verifying availability

  const priceList = []

  for( const [idx, item] of buyer.shoppingCart.items.entries()){
    const product = await Product.findById(item).session(session).exec()
    if(!product || product?.stock < buyer.shoppingCart.quantities[idx]){
      throw new Error(`this product is out of stock or does not exist: ${item.toString()}`, { cause: { title: 'UserError', code: 400} })
    }
    priceList.push(product.price)
  }

  const orderTotal = priceList.reduce((accumulator, currentValue, idx) => accumulator + (currentValue * buyer.shoppingCart.quantities[idx]), 0)

  const order = {
    ...buyer.shoppingCart,
    total: orderTotal
  }

  let contract = null  
  
  if(contractType === 'ContractWithPickup'){

    if(!seller.locations.includes(pickupLocation)){
      throw new Error('this location is not valid', { cause: { title: 'UserError', code: 400} })
    }

    console.log(expectedReadyDate)

    contract = new ContractWithPickup({
      buyer: buyer._id,
      seller: seller, 
      order: order, 
      history: {
        status: 'placed',
        timestamp: new Date()
      },
      expectedReadyDate: new Date(expectedReadyDate),
      pickupLocation: pickupLocation
    })
  }

  else if(contractType === 'ContractWithDelivery'){

    if(!buyer.locations.includes(deliveryLocation)){
      throw new Error('this location is not valid', { cause: { title: 'UserError', code: 400} })
    }

    contract = new ContractWithDelivery({
      buyer: buyer._id,
      seller: seller, 
      products: order,
      history: {
        status: 'placed',
        timestamp: new Date()
      },
      expectedReadyDate: new Date(expectedReadyDate),
      deliveryLocation: deliveryLocation
    })
  }

  if(!contract){
    throw new Error('contract type is invalid', { cause: { title: 'UserError', code: 400} })
  }

  //paying
  for( const [idx, item] of buyer.shoppingCart.items.entries()){
    await Product.findByIdAndUpdate(item, { $inc: { stock: (buyer.shoppingCart.quantities[idx] * -1) } }, {
      new: true,
      runValidators: true,
      context: 'query'
    }).session(session).exec()
  }

  const savedContract = await contract.save({ session })

  buyer.shoppingCart = {
    items: [],
    quantities: []
  }

  const updatedBuyer = await buyer.save({ session })

  await session.commitTransaction()
  session.endSession()
  request.mongoSession = null

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
contractsRouter.put('/updateDetails/:id', userExtractor, contractValidator, async (request, response) => {
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

contractsRouter.put('/updateStatus/:id', userExtractor, contractValidator, async (request, response) => {
  const { newStatus } = request.body

  const history = request.contract.history

  const validTransitions = {
    placed: [
      {
        to: 'preparing',
        by: ['Seller'],
        orderTypes: ['ContractWithDelivery', 'ContractWithPickup']
      },
      {
        to: 'canceled',
        by: ['Seller', 'Buyer'],
        orderTypes: ['ContractWithDelivery', 'ContractWithPickup']
      }
    ],
    preparing: [
      {
        to: 'ready',
        by: ['Seller'],
        orderTypes: ['ContractWithDelivery', 'ContractWithPickup']
      },
    ],
    ready: [
      {
        to: 'delivering',
        by: ['Deliverer'],
        orderTypes: ['ContractWithDelivery']
      },
      {
        to: 'picked_up',
        by: ['Buyer'],
        orderTypes: ['ContractWithPickup']
      },
    ],
    delivering: [
      {
        to: 'delivered',
        by: ['Buyer'],
        orderTypes: ['ContractWithDelivery']
      },
    ]
  }

  const validOptions = validTransitions[history.at(-1).status] ?? null
  
  const isValidStatus = validOptions?.some((o) => {
    return newStatus === o.to
  })

  const isValidRole = validOptions?.some((o) => {
    return o.by.includes(request.user.type)
  })

  const isValidOrderType = validOptions?.some((o) => {
    return o.orderTypes.includes(request.contract.type)
  })

  if(!isValidStatus || !isValidRole || !isValidOrderType){
    return response.status(400).json({
      error: 'this new status, user role or order type is not compatible with the order'
    })
  }

  //for delivering and picking up, apply payments to seller and deliverer (in contracts with delivering)

  let updatedContract

  if(newStatus === 'canceled'){

    const session = await mongoose.startSession()
    request.mongoSession = session
    session.startTransaction()

    for( const [idx, item] of request.contract.order.items.entries()){
      await Product.findByIdAndUpdate(item, { $inc: { stock: request.contract.order.quantities[idx] } }, {
        new: true,
        runValidators: true,
        context: 'query'
      }).session(session).exec()
    }

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
    request.mongoSession = null

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

module.exports = contractsRouter
