const logger = require('./logger')
const User = require('../models/user')
const jwt = require('jsonwebtoken')
const config = require('./config')
const crypto = require('crypto')
const Product = require('../models/product')
const DeliveryRequest = require('../models/deliveryRequest')
const DeliveryOffer = require('../models/deliveryOffer')

const requestLogger = (request, response, next) => {
  logger.info('Method:', request.method)
  logger.info('Path:  ', request.path)
  logger.info('Body:  ', request.body)
  logger.info('---')
  next()
}

const unknownEndpoint = (request, response) => {
  response.status(404).send({ error: 'unknown endpoint' })
}

const errorHandler = (error, request, response, next) => {
  if (error.name === 'CastError') {
    return response.status(400).json({ error: 'malformatted id' })
  }
  else if (error.name === 'SyntaxError') {
    return response.status(400).json({ error: 'invalid request' })
  }
  else if (error.name === 'ValidationError') {
    return response.status(400).json({ error: error.message })
  }
  else if (error.name === 'JsonWebTokenError') {
    return response.status(401).json({ error: 'invalid token' })
  }
  next(error)
}

const userExtractor = async (request, response, next) => {

  const authorization = request.get('authorization')
  if (authorization && authorization.toLowerCase().startsWith('bearer ')) {

    const token = authorization.substring(7)
    const decodedToken = jwt.verify(token, config.SECRET)

    const registeredToken = await config.redisClient.get(`jwt_${decodedToken.id}`)

    const user = await User.findById(decodedToken.id)

    if (!user) {
      return response.status(404).json({ error: 'this account does not exist' })
    }
    if (!registeredToken || !crypto.timingSafeEqual(Buffer.from(registeredToken), Buffer.from(token))) {
      return response.status(401).json({ error: 'this session has expired' })
    }
    /* Doing that last part to avoid timing attacks */

    request.user = user

  }
  else{
    return response.status(404).json({ error: 'token missing or invalid' })
  }

  next()

}

const userValidator = async (request, response, next) => {

  const user = await User.findById(request.params.id).exec()

  if (!user) {
    return response.status(404).json({ error: 'the account in parameter does not exist' })
  }

  const loggedUser = request.user

  if (loggedUser._id.toString() !== user._id.toString()) {
    return response
      .status(401)
      .json({ error: 'you are not authorized to perform this action' })
  }

  next()

}

const productValidator = async (request, response, next) => {

  const product = Product.findById(request.params.id).exec()

  if(!product){
    return response.status(404).json({
        error: 'product does not exist'
    })
  }

  if (request.user.type !== 'seller') {
    return response.status(401).json({
      error: 'user must be a seller'
    })
  }

  const loggedSeller = request.user

  if(product.seller.toString() !== loggedSeller._id.toString()){
    return response.status(401).json({
        error: 'you are not authorized to perform this action'
    })
  }

  next()

}

const deliveryRequestValidator = async (request, response, next) => {

  const deliveryRequest = DeliveryRequest.findById(request.params.id).exec()

  if(!deliveryRequest){
    return response.status(404).json({
        error: 'delivery request does not exist'
    })
  }

  if (request.user.type !== 'seller') {
    return response.status(401).json({
      error: 'user must be a seller'
    })
  }

  const loggedSeller = request.user

  if(deliveryRequest.seller.toString() !== loggedSeller._id.toString()){
    return response.status(401).json({
        error: 'you are not authorized to perform this action'
    })
  }

  if(deliveryRequest.contract){
    return response.status(401).json({
        error: 'the delivery request is bound to a contract'
    })
  }

  next()

}

const deliveryOfferValidator = async (request, response, next) => {

  const deliveryOffer = DeliveryOffer.findById(request.params.id).exec()

  if(!deliveryOffer){
    return response.status(404).json({
        error: 'delivery request does not exist'
    })
  }

  if (request.user.type !== 'deliverer') {
    return response.status(401).json({
      error: 'user must be a deliverer'
    })
  }

  const loggedDeliverer = request.user

  if(deliveryOffer.deliverer.toString() !== loggedDeliverer._id.toString()){
    return response.status(401).json({
        error: 'you are not authorized to perform this action'
    })
  }

  if(deliveryOffer.contract){
    return response.status(401).json({
        error: 'the delivery offer is bound to a contract'
    })
  }

  next()

}

module.exports = {
  requestLogger,
  unknownEndpoint,
  errorHandler,
  userExtractor,
  userValidator,
  productValidator,
  deliveryRequestValidator,
  deliveryOfferValidator
}