const forgotPassword = require('express').Router()
const Customer = require('../models/customer')
const jwt = require('jsonwebtoken')
const config = require('../utils/config')
const { sendEmail } = require('../utils/emailManager')

forgotPassword.post('/', async (request, response) => {

  const { email, phone, method } = request.body

  let customer = null

  if(email){
    customer = await Customer.findOne({ email }).exec()
  }
  else if (phone) {
    customer = await Customer.findOne({ phone }).exec()
  }
  else{
    return response.status(400).json({
      error: 'Please provide an email or phone'
    })
  }

  if (!customer){
    return response.status(400).json({
      error: 'sorry, we could not find this account'
    })
  }

  const customerForToken = {
    email: customer.email,
    phone: customer.phone,
    id: customer._id,
  }

  const token = jwt.sign( customerForToken, config.SECRET)

  await config.redisClient.set(`jwt_${customer._id.toString()}`, token)

  if(method === 'email'){
    await sendEmail('kabuia@email.com', email, 'Reset your password', `https://www.fakeurl.com/${customer._id}?token=${token}`)
  }
  else if (method === 'sms'){
    console.log('sms')
  }
  else{
    return response.status(400).json({
      error: 'Please specify the recovery method'
    })
  }

  response.status(204).end()

})

module.exports = forgotPassword