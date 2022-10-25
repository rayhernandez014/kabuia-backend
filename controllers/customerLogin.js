const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const customerLoginRouter = require('express').Router()
const Customer = require('../models/customer')
const config = require('../utils/config')

customerLoginRouter.post('/', async (request, response) => {
  const { email, password } = request.body

  const customer = await Customer.findOne({ email }).exec()
  const passwordCorrect = customer === null
    ? false
    : await bcrypt.compare(password, customer.passwordHash)

  if (!(customer && passwordCorrect)) {
    return response.status(401).json({
      error: 'invalid username or password'
    })
  }

  const customerForToken = {
    email: customer.email,
    id: customer._id,
  }

  const token = jwt.sign( customerForToken, config.SECRET)

  await config.redisClient.set(customer._id.toString(), token)

  response
    .status(200)
    .json({ token, email: customer.email, firstname: customer.firstname, lastname: customer.lastname })
})

module.exports = customerLoginRouter