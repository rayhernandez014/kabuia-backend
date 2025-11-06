const contractsRouter = require('express').Router()
const Contract = require('../models/contract')
const { userExtractor, contractValidator, roleValidator } = require('../utils/middleware')
const Buyer = require('../models/buyer')
const ContractWithPickup = require('../models/contractWithPickup')
const ContractWithDelivery = require('../models/contractWithDelivery')
const Seller = require('../models/seller')
const Product = require('../models/product')
const mongoose = require('mongoose')
const { createInvoice } = require('../utils/invoices')

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

  if (buyer.shoppingCart.items.length === 0) {
    throw new Error('shopping cart is empty', { cause: { title: 'UserError', code: 400} })
  }

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

    contract = new ContractWithPickup({
      buyer: buyer._id,
      seller: seller._id, 
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
      seller: seller._id, 
      order: order,
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

  for( const [idx, item] of buyer.shoppingCart.items.entries()){
    await Product.findByIdAndUpdate(item, { $inc: { stock: (buyer.shoppingCart.quantities[idx] * -1), reservedStock: (buyer.shoppingCart.quantities[idx]) } }, {
      new: true,
      runValidators: true,
      context: 'query'
    }).session(session).exec()
  }
 
  const savedContract = await contract.save({ session })

  //invoice creation 
  const invoice = await createInvoice(order.total, savedContract._id, 'order')

  savedContract.invoiceHistory = [...contract.invoiceHistory, {
    invoice: invoice.id,
    status: 'created',
    timestamp: new Date()
  }]

  savedContract.currentInvoice = invoice.id

  const updatedContract = await savedContract.save({ session })

  buyer.shoppingCart = {
    items: [],
    quantities: []
  }

  const updatedBuyer = await buyer.save({ session })

  await session.commitTransaction()
  session.endSession()
  request.mongoSession = null
  
  response.status(201).json({updatedContract})

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

  const history = request.contract.history

  if (request.user.type !== 'buyer') {
    return response.status(403).json({
      error: 'user must be a buyer'
    })
  }

  if(history.length !== 1 || history[0] !== 'placed'){
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

contractsRouter.put('/update-status/:id', userExtractor, contractValidator, async (request, response) => {
  const { newStatus } = request.body

  const history = request.contract.history

  const validTransitions = {
    placed: [
      {
        to: 'canceled',
        by: ['Seller', 'Buyer'],
        orderTypes: ['ContractWithDelivery', 'ContractWithPickup']
      }
    ],
    paid: [
      {
        to: 'preparing',
        by: ['Seller'],
        orderTypes: ['ContractWithDelivery', 'ContractWithPickup']
      },
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
        to: 'picked_up',
        by: ['Buyer'],
        orderTypes: ['ContractWithPickup']
      },
    ],
    awaiting_deliverer: [
      {
        to: 'delivering',
        by: ['Deliverer'],
        orderTypes: ['ContractWithDelivery']
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
      await Product.findByIdAndUpdate(item, { $inc: { stock: request.contract.order.quantities[idx], reservedStock: request.contract.order.quantities[idx] * -1 } }, {
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

contractsRouter.put('/re-invoice/:id', userExtractor, roleValidator(['Buyer']), contractValidator, async (request, response) => {
  
  const session = await mongoose.startSession()
  session.startTransaction()
  request.mongoSession = session

  const contract = request.contract

  if(contract.history.at(-1).status !== 'payment_failed'){
    throw new Error('the payment of this invoice has not failed', { cause: { title: 'UserError', code: 400} })
  }

  //verifying availability

  const priceList = []

  for( const [idx, item] of contract.order.items.entries()){
    const product = await Product.findById(item).session(session).exec()
    if(!product || product?.stock < contract.order.quantities[idx]){
      throw new Error(`this product is out of stock or does not exist: ${item.toString()}`, { cause: { title: 'UserError', code: 400} })
    }
    priceList.push(product.price)
  }

  const orderTotal = priceList.reduce((accumulator, currentValue, idx) => accumulator + (currentValue * contract.order.quantities[idx]), 0)

  //invoice creation 
  const invoice = await createInvoice(orderTotal, contract._id, 'order')

  contract.order.total = orderTotal //prices can change in the meantime so we recalculate total price, save it and use it for the invoice
  contract.invoiceHistory = [...contract.invoiceHistory, {
    invoice: invoice.id,
    status: 'created',
    timestamp: new Date()
  }]
  contract.currentInvoice = invoice.id
  contract.history = [...contract.history, {
    status: 'placed',
    timestamp: new Date()
  }]

  const updatedContract = await contract.save({ session })

  for( const [idx, item] of updatedContract.order.items.entries()){
    await Product.findByIdAndUpdate(item, { $inc: { stock: (updatedContract.order.quantities[idx] * -1), reservedStock: (updatedContract.order.quantities[idx]) } }, {
      new: true,
      runValidators: true,
      context: 'query'
    }).session(session).exec()
  }

  await session.commitTransaction()
  session.endSession()
  request.mongoSession = null

  response.json(updatedContract)

})

module.exports = contractsRouter
