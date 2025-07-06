const verifyUser = require('express').Router()
const User = require('../models/user')
const jwt = require('jsonwebtoken')
const config = require('../utils/config')
const { sendEmail } = require('../utils/emailManager')

verifyUser.post('/', async (request, response) => {

  const { email, phone } = request.body

  let user = null

  let precode = null

  if(email){
    user = await User.findOne({ email }).exec()
    precode = 'e'
  }
  else if (phone) {
    user = await User.findOne({ phone }).exec()
    precode = 'p'
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

  await config.redisClient.set(`${precode}_${user._id.toString()}`, token)

  if(email){
    await sendEmail('kabuia@email.com', user.email, 'Reset your password', `https://www.fakeurl.com/verify/?method=${precode}&token=${token}`)
  }
  else if (phone){
    console.log('sms')
  }
  else{
    return response.status(400).json({
      error: 'please specify the verification method'
    })
  }

  response.status(204).end()

})

module.exports = verifyUser