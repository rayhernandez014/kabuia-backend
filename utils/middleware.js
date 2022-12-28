const logger = require('./logger')
const Customer = require('../models/customer')
const jwt = require('jsonwebtoken')
const config = require('./config')
const crypto = require('crypto')

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

const customerExtractor = async (request, response, next) => {

  const authorization = request.get('authorization')
  if (authorization && authorization.toLowerCase().startsWith('bearer ')) {

    const token = authorization.substring(7)
    const decodedToken = jwt.verify(token, config.SECRET)

    const registeredToken = await config.redisClient.get(decodedToken.id)

    const customer = await Customer.findById(decodedToken.id)

    if (!customer) {
      return response.status(404).json({ error: 'This account does not exist' })
    }
    if (!registeredToken || !crypto.timingSafeEqual(Buffer.from(registeredToken), Buffer.from(token))) {
      return response.status(401).json({ error: 'This session has expired' })
    }
    /* Doing that last part to avoid timing attacks */

    request.customer = customer

  }
  else{
    return response.status(404).json({ error: 'Token missing or invalid' })
  }

  next()

}

const customerValidator = async (request, response, next) => {

  const customer = await Customer.findById(request.params.id).exec()

  if (!customer) {
    return response.status(404).json({ error: 'you are not authorized to perform this action' })
  }

  const loggedCustomer = request.customer

  if (loggedCustomer._id.toString() !== customer._id.toString()) {
    return response
      .status(401)
      .json({ error: 'you are not authorized to perform this action' })
  }

  next()

}

module.exports = {
  requestLogger,
  unknownEndpoint,
  errorHandler,
  customerExtractor,
  customerValidator
}