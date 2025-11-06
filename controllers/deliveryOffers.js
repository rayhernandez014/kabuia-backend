const deliveryOffersRouter = require('express').Router()
const DeliveryOffer = require('../models/deliveryOffer')
const { userExtractor, deliveryOfferValidator, roleValidator } = require('../utils/middleware')
const DeliveryRequest = require('../models/deliveryRequest')
const mongoose = require('mongoose')
const ContractWithDelivery = require('../models/contractWithDelivery')
const { createInvoice } = require('../utils/invoices')

deliveryOffersRouter.get('/:deliveryRequest', async (request, response) => {

  const {deliveryRequest} = request.params

  const deliveryOffers = await DeliveryOffer.find({deliveryRequest: deliveryRequest}).exec()
  response.json(deliveryOffers)
})

deliveryOffersRouter.post('/', userExtractor, roleValidator(['Deliverer']), async (request, response) => {
  const { price, deliveryRequestId } = request.body

  const deliveryRequest = await DeliveryRequest.findById(deliveryRequestId).exec()
  
  if (!deliveryRequest) {
    return response.status(400).json({
      error: 'the delivery request is invalid'
    })
  }

  if(deliveryRequest.status !== 'awaiting_offers'){
    return response.status(400).json({
      error: 'no more offers accepted'
    })
  }

  const deliverer = request.user

  const deliveryOffer = new DeliveryOffer({
    price: price,
    deliveryRequest: deliveryRequest._id,
    deliverer: deliverer._id
  })
  
  const savedDeliveryOffer = await deliveryOffer.save() 

  deliveryRequest.deliveryOffers = [...deliveryRequest.deliveryOffers, savedDeliveryOffer._id]

  await deliveryRequest.save()

  deliverer.deliveryOffers = [...deliverer.deliveryOffers, savedDeliveryOffer._id]

  const updatedDeliverer = await deliverer.save()

  response.status(201).json({savedDeliveryOffer, updatedDeliverer})

})

/*
deliveryOffersRouter.delete( '/:id', userExtractor, deliveryOfferValidator, async (request, response) => {

  await DeliveryOffer.findByIdAndRemove(request.params.id).exec()

  const newDelivererData = {
    deliveryOffers: [...request.user.deliveryOffers].filter((p) => p.toString() !== request.params.id)
  }

  await Deliverer.findByIdAndUpdate(request.user._id, newDelivererData, {
    new: true,
    runValidators: true,
    context: 'query'
  }).exec()

  response.status(204).end()

})
*/

deliveryOffersRouter.put('/accept-delivery/:id', userExtractor, deliveryOfferValidator, async (request, response) => {

  const session = await mongoose.startSession()
  request.mongoSession = session
  session.startTransaction()

  const deliveryOffer = request.deliveryOffer

  deliveryOffer.status = 'accepted'

  const updatedDeliveryOffer = await deliveryOffer.save({ session })

  const deliveryRequest = await DeliveryRequest.findById(updatedDeliveryOffer.deliveryRequest).session(session).exec()

  //invoice creation 
  const invoice = await createInvoice(deliveryOffer.price, deliveryRequest.contract, 'delivery')

  deliveryRequest.status = 'offer_accepted'
  deliveryRequest.currentInvoice = invoice.id,
  deliveryRequest.invoiceHistory = [...deliveryRequest.invoiceHistory, {
      invoice: invoice.id,
      status: 'created',
      timestamp: new Date()
    } 
  ]

  const updatedDeliveryRequest = await deliveryRequest.save({ session })

  const receivedContract = {
    deliverer: updatedDeliveryOffer.deliverer,
    deliveryOffer: request.params.id
  }

  const updatedContract = await ContractWithDelivery.findByIdAndUpdate(updatedDeliveryRequest.contract, receivedContract, {
    new: true,
    runValidators: true,
    context: 'query'
  }).session(session).exec()

  await session.commitTransaction()
  session.endSession()
  request.mongoSession = null

  //notify the seller

  response.json(updatedDeliveryOffer)

})


deliveryOffersRouter.put('/decline-delivery/:id', userExtractor, deliveryOfferValidator, async (request, response) => {

  const session = await mongoose.startSession()
  request.mongoSession = session
  session.startTransaction()

  const deliveryOffer = request.deliveryOffer

  deliveryOffer.status = 'declined'

  const updatedDeliveryOffer = await deliveryOffer.save({ session })

  const nextBestOffer = await DeliveryOffer.findOne({
    status: 'rejected',
  }).sort('price').session(session).exec() //this could be limited to recent bids only, using "createdAt" mongoDB field

  if(nextBestOffer){
    nextBestOffer.status = 'selected'
    await nextBestOffer.save({ session })

    //notify the deliverer
  }
  else{
    const receivedDeliveryRequest = {
      status: 'awaiting_offers',
      selectedDeliveryOffer: null
    }

    const updatedDeliveryRequest = await DeliveryRequest.findByIdAndUpdate(updatedDeliveryOffer.deliveryRequest, receivedDeliveryRequest , {
      new: true,
      runValidators: true,
      context: 'query'
    }).session(session).exec()
  }  

  //penalize deliverer for declining

  await session.commitTransaction()
  session.endSession()
  request.mongoSession = null

  response.json(updatedDeliveryOffer)

})

module.exports = deliveryOffersRouter
