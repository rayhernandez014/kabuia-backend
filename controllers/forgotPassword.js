const forgotPassword = require('express').Router()
const nodemailer = require('nodemailer')
const Customer = require('../models/customer')
const jwt = require('jsonwebtoken')
const config = require('../utils/config')

forgotPassword.post('/', async (request, response) => {

  const { email, phone } = request.body

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

  await config.redisClient.set(customer._id.toString(), token)

  const testAccount = await nodemailer.createTestAccount()

  const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: testAccount.user, // generated ethereal user
      pass: testAccount.pass, // generated ethereal password
    },
  })

  const info = await transporter.sendMail({
    from: '"Fred Foo 👻" <foo@example.com>', // sender address
    to: email, // list of receivers
    subject: 'Reset your account', // Subject line
    text: `https://www.fakeurl.com/${token}`, // plain text body
  })

  console.log('Message sent: %s', info.messageId)
  console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info))

  response.status(204).end()

})

module.exports = forgotPassword