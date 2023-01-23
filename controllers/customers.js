const customersRouter = require('express').Router()
const Customer = require('../models/customer')
const config = require('../utils/config')
const { customerExtractor, customerValidator } = require('../utils/middleware')
const { validatePassword, hashPassword, comparePasswords } = require('../utils/security')

customersRouter.get('/', customerExtractor, async (request, response) => {
  const id = request.customer._id.toString()
  const customer = await Customer.findById( id ).exec()
  response.json(customer)
})

customersRouter.post('/', async (request, response) => {
  const { firstname, lastname, email, phone, password, photo, stripeID, latitude, longitude } = request.body

  if (!validatePassword(password)) {
    return response.status(400).json({
      error: 'Password is not strong enough'
    })
  }

  let existingCustomer = await Customer.findOne({ email }).exec()
  if (existingCustomer?.email) {
    return response.status(400).json({ error: 'This email is already registered as a customer' })
  }

  existingCustomer = await Customer.findOne({ phone }).exec()
  if (existingCustomer?.phone) {
    return response.status(400).json({ error: 'This phone is already registered as a customer' })
  }

  const passwordHash = await hashPassword(password)

  const customer = new Customer({
    firstname: firstname,
    lastname: lastname,
    email: email,
    phone: phone,
    passwordHash: passwordHash,
    photo: photo ?? '',
    serviceRequests: [],
    reviews: [],
    cancelationRatio: 0,
    stripeID: stripeID ?? '',
    longitude: longitude,
    latitude: latitude
  })

  const savedCustomer = await customer.save()

  response.status(201).json(savedCustomer)
})

customersRouter.delete( '/:id', customerExtractor, customerValidator, async (request, response) => {

  await config.redisClient.del(request.params.id)

  await Customer.findByIdAndRemove(request.params.id).exec()
  response.status(204).end()

})

customersRouter.put('/:id', customerExtractor, customerValidator, async (request, response) => {
  const { firstname, lastname, photo, stripeID, latitude, longitude } = request.body

  const receivedCustomer = {
    firstname: firstname,
    lastname: lastname,
    photo: photo,
    stripeID: stripeID,
    latitude: latitude,
    longitude: longitude
  }

  const updatedCustomer = await Customer.findByIdAndUpdate(request.params.id, receivedCustomer, {
    new: true,
    runValidators: true,
    context: 'query'
  }).exec()
  response.json(updatedCustomer)
})

customersRouter.put('/password/:id', customerExtractor, customerValidator, async (request, response) => {
  const { currentPassword, newPassword, confirmPassword } = request.body
  const customer = request.customer

  const passwordCorrect = ((customer === null) || !currentPassword)
    ? false
    : await comparePasswords(currentPassword, customer.passwordHash)

  if (!passwordCorrect) {
    return response.status(401).json({
      error: 'invalid credentials'
    })
  }

  if (newPassword !== confirmPassword){
    return response.status(400).json({
      error: 'new passwords do not match'
    })
  }

  if (!validatePassword(newPassword)) {
    return response.status(400).json({
      error: 'Password is not strong enough'
    })
  }

  const newPasswordHash = await hashPassword(newPassword)

  const receivedCustomer = {
    passwordHash: newPasswordHash
  }

  await Customer.findByIdAndUpdate(request.params.id, receivedCustomer, {
    new: true,
    runValidators: true,
    context: 'query'
  }).exec()
  response.status(204).end()
})

module.exports = customersRouter
