const logger = require('./logger')
const User = require('../models/user')
const jwt = require('jsonwebtoken')
const config = require('./config')
const crypto = require('crypto')
const Product = require('../models/product')
const DeliveryRequest = require('../models/deliveryRequest')
const DeliveryOffer = require('../models/deliveryOffer')
const Contract = require('../models/contract')
const Review = require('../models/review')
const Location = require('../models/location')

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

const errorHandler = async (error, request, response, next) => {

  if (request?.mongoSession) {
    try {
      await request.mongoSession.abortTransaction();
    } catch (abortError) {
      console.warn('Error aborting transaction:', abortError.message);
    }
    try {
      await request.mongoSession.endSession();
    } catch (endError) {
      console.warn('Session already ended:', endError.message);
    }
    request.mongoSession = null; // Clear session
  }
  

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
  else if(error.cause?.title === 'UserError') {
    return response.status( error.cause.code ).json({ error: error.message })
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
    return response.status(403).json({ error: 'you are not authorized to perform this action' })
  }

  next()

}

const productValidator = async (request, response, next) => {

  const product = await Product.findById(request.params.id).exec()

  if(!product){
    return response.status(404).json({
        error: 'product does not exist'
    })
  }

  if (request.user.type !== 'Seller') {
    return response.status(403).json({
      error: 'user must be a seller'
    })
  }

  const loggedSeller = request.user

  if(product.seller.toString() !== loggedSeller._id.toString()){
    return response.status(403).json({
        error: 'you are not authorized to perform this action'
    })
  }

  request.product = product

  next()

}

const deliveryRequestValidator = async (request, response, next) => {

  const deliveryRequest = await DeliveryRequest.findById(request.params.id).exec()

  if(!deliveryRequest){
    return response.status(404).json({
        error: 'delivery request does not exist'
    })
  }

  if (request.user.type !== 'Seller') {
    return response.status(403).json({
      error: 'user must be a seller'
    })
  }

  if(deliveryRequest.status === 'offer_selected'){
    return response.status(404).json({
        error: 'this action cannot be performed'
    })
  }

  const loggedSeller = request.user

  if(deliveryRequest.seller.toString() !== loggedSeller._id.toString()){
    return response.status(403).json({
      error: 'you are not authorized to perform this action'
    })
  }

  request.deliveryRequest = deliveryRequest

  next()

}

const deliveryOfferValidator = async (request, response, next) => {

  const deliveryOffer = await DeliveryOffer.findById(request.params.id).exec()

  if(!deliveryOffer){
    return response.status(404).json({
        error: 'delivery request does not exist'
    })
  }

  if (request.user.type !== 'Deliverer') {
    return response.status(403).json({
      error: 'user must be a deliverer'
    })
  }

  if(deliveryOffer.status !== 'selected'){
    return response.status(404).json({
        error: 'this action cannot be performed'
    })
  }

  const loggedDeliverer = request.user

  if(deliveryOffer.deliverer.toString() !== loggedDeliverer._id.toString()){
    return response.status(403).json({
        error: 'you are not authorized to perform this action'
    })
  }

  request.deliveryOffer = deliveryOffer

  next()

}

const contractValidator = async (request, response, next) => {

  const contract = await Contract.findById(request.params.id).exec()

  if(!contract){
    return response.status(404).json({
        error: 'contract does not exist'
    })
  }

  request.contract = contract

  const loggedUser = request.user

  if(!loggedUser._id || ![contract.seller.toString(), contract.buyer.toString(), contract.deliverer?.toString()].includes(loggedUser._id.toString())){
    return response.status(403).json({
        error: 'you are not authorized to perform this action'
    })
  }

  next()

}

const reviewValidator = async (request, response, next) => {

  const review = await Review.findById(request.params.id).exec()

  if(!review){
    return response.status(404).json({
        error: 'review does not exist'
    })
  }

  request.review = review

  next()

}

const locationValidator = async (request, response, next) => {

  const location = await Location.findById(request.params.id).exec()

  if(!location){
    return response.status(404).json({
        error: 'location does not exist'
    })
  }

  const loggedUser = request.user

  if(location.user.toString() !== loggedUser._id.toString()){
    return response.status(403).json({
        error: 'you are not authorized to perform this action'
    })
  }

  request.location = location

  next()

}

const roleValidator = (roles) => async (request, response, next) => {

  const role = request.user.type

  if (!roles.includes(role)) {
    return response.status(403).json({ error: 'you are not authorized to perform this action' })
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
  deliveryOfferValidator,
  contractValidator,
  reviewValidator,
  roleValidator,
  locationValidator
}