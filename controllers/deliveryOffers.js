const deliveryOffersRouter = require('express').Router()
const DeliveryOffer = require('../models/deliveryOffer')
const { userExtractor, deliveryOfferValidator } = require('../utils/middleware')
const Deliverer = require('../models/deliverer')

deliveryOffersRouter.get('/:deliveryRequest', async (request, response) => {

  const {deliveryRequest} = request.params

  const deliveryOffers = await DeliveryOffer.find({deliveryRequest: deliveryRequest}).exec()
  response.json(deliveryOffers)
})

deliveryOffersRouter.post('/', userExtractor, async (request, response) => {
  const { price, deliveryRequest } = request.body

  if (request.user.type !== 'deliverer') {
    return response.status(401).json({
      error: 'user must be a deliverer'
    })
  }

  const deliverer = request.user

  const deliveryOffer = new DeliveryOffer({
    price: price,
    deliveryRequest: deliveryRequest,
    deliverer: deliverer._id
  })
  
  const savedDeliveryOffer = await deliveryOffer.save().exec()  
  
  const newDelivererData = {
    deliveryOffers: [...deliverer.deliveryOffers, savedDeliveryOffer._id]
  }
  
  const updatedDeliverer = await Deliverer.findByIdAndUpdate(deliverer._id, newDelivererData, {
    new: true,
    runValidators: true,
    context: 'query'
  }).exec()

  response.status(201).json({savedDeliveryOffer, updatedDeliverer})

})

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

deliveryOffersRouter.put('/:id', userExtractor, deliveryOfferValidator, async (request, response) => {
  const { price, deliveryRequest }  = request.body

  const receivedDeliveryOffer = {
    price: price,
    deliveryRequest: deliveryRequest,
  }

  const updatedDeliveryOffer = await DeliveryOffer.findByIdAndUpdate(request.params.id, receivedDeliveryOffer , {
    new: true,
    runValidators: true,
    context: 'query'
  }).exec()

  response.json(updatedDeliveryOffer)

})

module.exports = deliveryOffersRouter
