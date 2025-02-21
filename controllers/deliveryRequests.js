const deliveryRequestsRouter = require('express').Router()
const DeliveryRequest = require('../models/product')
const { userExtractor, productValidator, deliveryRequestValidator } = require('../utils/middleware')
const Buyer = require('../models/buyer')
const Seller = require('../models/seller')
const Deliverer = require('../models/deliverer')

deliveryRequestsRouter.get('/:date/:origin/:destination', async (request, response) => {

  const {date, origin, destination} = request.params

  const products = await DeliveryRequest.find({date: date, origin: origin, destination: destination}).exec()
  response.json(products)
})

deliveryRequestsRouter.post('/', userExtractor, async (request, response) => {
  const { title, description, origin, destination, date } = request.body

  if (request.user.type !== 'seller') {
    return response.status(401).json({
      error: 'user must be a seller'
    })
  }

  const seller = request.user

  const deliveryRequest = new DeliveryRequest({
    title: title, 
    description: description, 
    origin: origin, 
    destination: destination,
    date: date,
    seller: seller._id
  })
  
  const savedDeliveryRequest = await deliveryRequest.save().exec()  
  
  const newSellerData = {
    deliveryRequests: [...seller.deliveryRequests, savedDeliveryRequest._id]
  }
  
  const updatedSeller = await Seller.findByIdAndUpdate(seller._id, newSellerData, {
    new: true,
    runValidators: true,
    context: 'query'
  }).exec()

  response.status(201).json({savedDeliveryRequest, updatedSeller})

})

deliveryRequestsRouter.delete( '/:id', userExtractor, deliveryRequestValidator, async (request, response) => {

  await DeliveryRequest.findByIdAndRemove(request.params.id).exec()

  const newSellerData = {
    deliveryRequests: [...request.user.deliveryRequests].filter((p) => p.toString() !== request.params.id)
  }

  await Seller.findByIdAndUpdate(request.user._id, newSellerData, {
    new: true,
    runValidators: true,
    context: 'query'
  }).exec()

  response.status(204).end()

})

deliveryRequestsRouter.put('/:id', userExtractor, deliveryRequestValidator, async (request, response) => {
  const { title, description, origin, destination, date } = request.body

  const receivedDeliveryRequest = {
    title: title, 
    description: description, 
    origin: origin, 
    destination: destination,
    date: date,
  }

  const updatedDeliveryRequest = await Buyer.findByIdAndUpdate(request.params.id, receivedDeliveryRequest , {
    new: true,
    runValidators: true,
    context: 'query'
  }).exec()

  response.json(updatedDeliveryRequest)

})

module.exports = deliveryRequestsRouter
