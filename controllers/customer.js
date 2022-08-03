const bcrypt = require('bcrypt')
const customerRouter = require('express').Router()
const Customer = require('../models/customer')

customerRouter.post('/', async (request, response) => {
  const { firstname, lastname, email, password, photo, stripeID } = request.body

  if (!password) {
    return response.status(400).json({
      error: 'Password is missing'
    })
  } else if (password.length < 8) {
    return response.status(400).json({
      error: 'Password should be at least 8 characters long'
    })
  }

  const existingCustomer = await Customer.findOne({ email })
  if (existingCustomer) {
    return response.status(400).json({ error: 'This email is already registered as a customer' })
  }

  const saltRounds = 10
  const passwordHash = await bcrypt.hash(password, saltRounds)

  const customer = new Customer({
    firstname: firstname,
    lastname: lastname,
    email: email,
    passwordHash: passwordHash,
    photo: photo ?? null,
    serviceRequests: [],
    reviews: [],
    cancelationRatio: 0,
    stripeID: stripeID ?? null,
  })

  const savedCustomer = await customer.save()

  response.status(201).json(savedCustomer)
})

customerRouter.get('/', async (request, response) => {
  const customers = await Customer.find({})
  response.json(customers)
})
module.exports = customerRouter
