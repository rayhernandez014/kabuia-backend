const bcrypt = require('bcrypt')
const customersRouter = require('express').Router()
const Customer = require('../models/customer')

customersRouter.get('/', async (request, response) => {
  const customers = await Customer.find({})
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

  let existingCustomer = await Customer.findOne({ email })
  if (existingCustomer && existingCustomer?.email) {
    return response.status(400).json({ error: 'This email is already registered as a customer' })
  }

  existingCustomer = await Customer.findOne({ phone })
  if (existingCustomer && existingCustomer?.phone) {
    return response.status(400).json({ error: 'This phone is already registered as a customer' })
  }

  const saltRounds = 10
  const passwordHash = await bcrypt.hash(password, saltRounds)

  const customer = new Customer({
    firstname: firstname,
    lastname: lastname,
    email: email ?? '',
    phone: phone ?? '',
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

customersRouter.delete( '/:id', async (request, response) => {

  await Customer.findByIdAndRemove(request.params.id)
  response.status(204).end()

})

customersRouter.put('/:id', async (request, response) => {
  const body = request.body

  const receivedCustomer = {
    firstname: body.firstname,
    lastname: body.lastname,
    photo: body.photo,
    stripeID: body.stripeID
  }

  const updatedCustomer = await Customer.findByIdAndUpdate(request.params.id, receivedCustomer, {
    new: true,
    runValidators: true,
    context: 'query'
  })
  response.json(updatedCustomer)
})

module.exports = customersRouter
