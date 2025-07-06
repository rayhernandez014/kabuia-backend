const deliveryRequestsRouter = require('express').Router()
const DeliveryRequest = require('../models/deliveryRequest')
const { userExtractor, deliveryRequestValidator } = require('../utils/middleware')
const Seller = require('../models/seller')
const ContractWithDelivery = require('../models/contractWithDelivery')
const mongoose = require('mongoose')
const DeliveryOffer = require('../models/deliveryOffer')

deliveryRequestsRouter.get('/:date/:origin/:destination', async (request, response) => {

  const {date, origin, destination} = request.params

  const deliveryRequests = await DeliveryRequest.find({date: date, origin: origin, destination: destination}).exec()
  response.json(deliveryRequests)
})

deliveryRequestsRouter.post('/', userExtractor, roleValidator(['seller']), async (request, response) => {
  const { title, description, origin, destination, date, contract } = request.body

  const seller = request.user

  const deliveryRequest = new DeliveryRequest({
    title: title, 
    description: description, 
    origin: origin, 
    destination: destination,
    date: date,
    seller: seller._id,
    contract: contract,
    deliveryOffers: []
  })
  
  const savedDeliveryRequest = await deliveryRequest.save()

  seller.deliveryRequests = [...seller.deliveryRequests, savedDeliveryRequest._id]

  const updatedSeller = await seller.save()

  const contractData = {
    deliveryRequest: savedDeliveryRequest._id
  }

  await ContractWithDelivery.findByIdAndUpdate(contract, contractData, {
    new: true,
    runValidators: true,
    context: 'query'
  }).exec()

  response.status(201).json({savedDeliveryRequest, updatedSeller})

})
/*
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
*/

deliveryRequestsRouter.put('/update/:id', userExtractor, deliveryRequestValidator, async (request, response) => {
  const { title, description, date, origin, destination } = request.body

  const receivedDeliveryRequest = {
    title: title, 
    description: description, 
    origin: origin, 
    destination: destination,
    date: date,
  }

  const updatedDeliveryRequest = await DeliveryRequest.findByIdAndUpdate(request.params.id, receivedDeliveryRequest , {
    new: true,
    runValidators: true,
    context: 'query'
  }).exec()

  //notify all candidates

  response.json(updatedDeliveryRequest)

})

deliveryRequestsRouter.put('/selectOffer/:id', userExtractor, deliveryRequestValidator, async (request, response) => {
  const { selectedDeliveryOffer } = request.body

  const receivedDeliveryRequest = {
    selectedDeliveryOffer: selectedDeliveryOffer,
    status: 'offer_selected'
  }

  const session = await mongoose.startSession()
  request.session.mongoSession = session
  session.startTransaction()

  const deliveryRequest = request.deliveryRequest

  deliveryRequest.status = 'offer_selected'
  deliveryRequest.selectedDeliveryOffer = selectedDeliveryOffer

  const updatedDeliveryRequest = await deliveryRequest.save({ session })

  DeliveryOffer.updateMany({deliveryRequest: request.params.id, _id: { $ne: selectedDeliveryOffer }, status: 'pending'}, {status: 'rejected'}, { session }).exec()

  await session.commitTransaction()
  session.endSession()
  request.session.mongoSession = null

  //notify all candidates

  response.json(updatedDeliveryRequest)

})

module.exports = deliveryRequestsRouter
