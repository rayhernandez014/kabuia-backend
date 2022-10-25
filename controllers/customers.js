const bcrypt = require('bcrypt')
const customersRouter = require('express').Router()
const Customer = require('../models/customer')
const config = require('../utils/config')
const middleware = require('../utils/middleware')

customersRouter.get('/', async (request, response) => {
  const customers = await Customer.find({}).exec()
  response.json(customers)
})

customersRouter.post('/', async (request, response) => {
  const { firstname, lastname, email, phone, password, photo, stripeID } = request.body

  if (!password) {
    return response.status(400).json({
      error: 'Password is missing'
    })
  } else if (password.length < 8) {
    return response.status(400).json({
      error: 'Password should be at least 8 characters long'
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

  const saltRounds = 10
  const passwordHash = await bcrypt.hash(password, saltRounds)

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
    stripeID: stripeID ?? ''
  })

  const savedCustomer = await customer.save()

  response.status(201).json(savedCustomer)
})

customersRouter.delete( '/:id', middleware.customerExtractor, async (request, response) => {

  const customer = await Customer.findById(request.params.id).exec()

  if (!customer) {
    return response.status(404).json({ error: 'customer does not exist' })
  }

  const loggedCustomer = request.customer

  if (loggedCustomer._id.toString() !== customer._id.toString()) {
    return response
      .status(401)
      .json({ error: 'only the user can delete itself' })
  }

  await config.redisClient.del(request.params.id)

  await Customer.findByIdAndRemove(request.params.id).exec()
  response.status(204).end()

})

customersRouter.put('/:id',middleware.customerExtractor, async (request, response) => {
  const { firstname, lastname, photo, stripeID, latitude, longitude } = request.body

  const customer = await Customer.findById(request.params.id).exec()

  if (!customer) {
    return response.status(404).json({ error: 'customer does not exist' })
  }

  const loggedCustomer = request.customer

  if (loggedCustomer._id.toString() !== customer._id.toString()) {
    return response
      .status(401)
      .json({ error: 'only the user can modify itself' })
  }

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

module.exports = customersRouter
