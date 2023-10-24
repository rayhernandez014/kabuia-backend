const forgotPassword = require('express').Router()
const User = require('../models/user')
const jwt = require('jsonwebtoken')
const config = require('../utils/config')
const { sendEmail } = require('../utils/emailManager')

forgotPassword.post('/', async (request, response) => {

  const { email, phone, method } = request.body

  let user = null

  if(email){
    user = await User.findOne({ email }).exec()
  }
  else if (phone) {
    user = await User.findOne({ phone }).exec()
  }
  else{
    return response.status(400).json({
      error: 'please provide an email or phone'
    })
  }

  if (!user){
    return response.status(404).json({
      error: 'sorry, we could not find this account'
    })
  }

  const userForToken = {
    email: user.email,
    phone: user.phone,
    id: user._id,
  }

  const token = jwt.sign( userForToken, config.SECRET)

  await config.redisClient.set(`jwt_${user._id.toString()}`, token)

  if(method === 'email'){
    await sendEmail('kabuia@email.com', email, 'Reset your password', `https://www.fakeurl.com/password/?id=${user._id.toString()}&token=${token}`)
  }
  else if (method === 'sms'){
    console.log('sms')
  }
  else{
    return response.status(400).json({
      error: 'please specify the recovery method'
    })
  }

  response.status(204).end()

})

module.exports = forgotPassword