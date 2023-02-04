const jwt = require('jsonwebtoken')
const loginRouter = require('express').Router()
const User = require('../models/user')
const config = require('../utils/config')
const { comparePasswords } = require('../utils/security')

loginRouter.post('/', async (request, response) => {
  const { email, phone, password } = request.body

  let user = null

  if(email){
    user = await User.findOne({ email }).exec()
  }
  else if (phone) {
    user = await User.findOne({ phone }).exec()
  }
  else{
    return response.status(401).json({
      error: 'Please provide an email or phone'
    })
  }

  const passwordCorrect = ((user === null) || !password)
    ? false
    : await comparePasswords(password, user.passwordHash)

  if (!(user && passwordCorrect)) {
    return response.status(401).json({
      error: 'invalid credentials'
    })
  }

  const userForToken = {
    email: user.email,
    phone: user.phone,
    id: user._id,
  }

  const token = jwt.sign( userForToken, config.SECRET)

  await config.redisClient.set(user._id.toString(), token)

  response
    .status(200)
    .json({ token })
})

module.exports = loginRouter