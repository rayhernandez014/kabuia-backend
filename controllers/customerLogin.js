const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const customerLoginRouter = require('express').Router()
const Customer = require('../models/customer')
const config = require('../utils/config')

customerLoginRouter.post('/', async (request, response) => {
  const { email, phone, password } = request.body

  let customer = null

  if(email){
    customer = await Customer.findOne({ email }).exec()
  }
  else if (phone) {
    customer = await Customer.findOne({ phone }).exec()
  }
  else{
    return response.status(401).json({
      error: 'Please provide an email or phone'
    })
  }

  const passwordCorrect = customer === null
    ? false
    : await bcrypt.compare(password, customer.passwordHash)

  if (!(customer && passwordCorrect)) {
    return response.status(401).json({
      error: 'invalid credentials'
    })
  }

  const customerForToken = {
    email: customer.email,
    phone: customer.phone,
    id: customer._id,
  }

  const token = jwt.sign( customerForToken, config.SECRET)

  await config.redisClient.set(customer._id.toString(), token)

  response
    .status(200)
    .json({ token })
})

module.exports = customerLoginRouter