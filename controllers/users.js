const usersRouter = require('express').Router()
const User = require('../models/user')
const config = require('../utils/config')
const { userExtractor, userValidator } = require('../utils/middleware')
const { validatePassword, hashPassword } = require('../utils/security')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const Buyer = require('../models/buyer')
const Seller = require('../models/seller')
const Deliverer = require('../models/deliverer')

usersRouter.get('/', userExtractor, async (request, response) => {
  const id = request.user._id.toString()
  const user = await User.findById( id ).exec()
  response.json(user)
})

usersRouter.post('/', async (request, response) => {
  const { firstname, lastname, email, phone, password, photo, stripeID, locations, type, temp_shoppingCart } = request.body

  if (!validatePassword(password)) {
    return response.status(400).json({
      error: 'password is not strong enough'
    })
  }

  let existingUser = await User.findOne({ email }).exec()
  if (existingUser?.email) {
    return response.status(400).json({ error: 'this email is already registered' })
  }

  existingUser = await User.findOne({ phone }).exec()
  if (existingUser?.phone) {
    return response.status(400).json({ error: 'this phone is already registered' })
  }

  const passwordHash = await hashPassword(password)

  if(type === 'buyer'){

    const shoppingCart = {
      items: temp_shoppingCart ? temp_shoppingCart.items : [],
      quantities: temp_shoppingCart ? temp_shoppingCart.quantities : []
    }
        
    const buyer = new Buyer({
      firstname: firstname,
      lastname: lastname,
      email: email,
      phone: phone,
      emailVerified: false,
      phoneVerified: false,
      passwordHash: passwordHash,
      photo: photo ?? '',
      reviews: [],
      stripeID: stripeID ?? '',
      locations: locations,
      shoppingCart: shoppingCart
    })

    const savedBuyer = await buyer.save().exec()
    response.status(201).json(savedBuyer)
  }
  else if (type === 'seller'){
    const seller = new Seller({
      firstname: firstname,
      lastname: lastname,
      email: email,
      phone: phone,
      emailVerified: false,
      phoneVerified: false,
      passwordHash: passwordHash,
      photo: photo ?? '',
      reviews: [],
      stripeID: stripeID ?? '',
      locations: locations,
      deliveryRequests: [],
      catalog: []
    })

    const savedSeller = await seller.save().exec()
    response.status(201).json(savedSeller)
  }
  else if (type === 'deliverer'){
    const deliverer = new Deliverer({
      firstname: firstname,
      lastname: lastname,
      email: email,
      phone: phone,
      emailVerified: false,
      phoneVerified: false,
      passwordHash: passwordHash,
      photo: photo ?? '',
      reviews: [],
      stripeID: stripeID ?? '',
      locations: locations,
      deliveryRequests: [],
    })

    const savedDeliverer = await deliverer.save().exec()
    response.status(201).json(savedDeliverer)
  }
  else{
    return response.status(400).json({ error: 'Invalid user type' })
  }

})

usersRouter.delete( '/:id', userExtractor, userValidator, async (request, response) => {

  await config.redisClient.del(`jwt_${request.params.id}`)

  await User.findByIdAndRemove(request.params.id).exec()
  response.status(204).end()

})

usersRouter.put('/:id', userExtractor, userValidator, async (request, response) => {
  const { firstname, lastname, photo, stripeID, locations, shoppingCart } = request.body

  if(request.user.type === 'buyer'){
    const receivedBuyer = {
      firstname: firstname,
      lastname: lastname,
      photo: photo,
      stripeID: stripeID,
      locations: locations,
      shoppingCart: shoppingCart
    }

    const updatedBuyer = await Buyer.findByIdAndUpdate(request.params.id, receivedBuyer, {
      new: true,
      runValidators: true,
      context: 'query'
    }).exec()

    response.json(updatedBuyer)
  }
  else if (request.user.type === 'seller'){
    const receivedSeller = {
      firstname: firstname,
      lastname: lastname,
      photo: photo,
      stripeID: stripeID,
      locations: locations
    }

    const updatedSeller = await Seller.findByIdAndUpdate(request.params.id, receivedSeller, {
      new: true,
      runValidators: true,
      context: 'query'
    }).exec()

    response.json(updatedSeller)
  }
  else if (request.user.type === 'deliverer'){
    const receivedDeliverer = {
      firstname: firstname,
      lastname: lastname,
      photo: photo,
      stripeID: stripeID,
      locations: locations
    }

    const updatedDeliverer = await Deliverer.findByIdAndUpdate(request.params.id, receivedDeliverer, {
      new: true,
      runValidators: true,
      context: 'query'
    }).exec()

    response.json(updatedDeliverer)
  }
  else{
    return response.status(400).json({ error: 'Invalid user type' })
  }

})

usersRouter.put('/password/:id', userExtractor, userValidator, async (request, response) => {
  const { newPassword, confirmPassword } = request.body

  if (newPassword !== confirmPassword){
    return response.status(400).json({
      error: 'new passwords do not match'
    })
  }

  if (!validatePassword(newPassword)) {
    return response.status(400).json({
      error: 'password is not strong enough'
    })
  }

  const newPasswordHash = await hashPassword(newPassword)

  const receivedUser = {
    passwordHash: newPasswordHash
  }

  await User.findByIdAndUpdate(request.params.id, receivedUser, {
    new: true,
    runValidators: true,
    context: 'query'
  }).exec()

  await config.redisClient.del(`jwt_${request.params.id.toString()}`)

  response.status(204).end()
})

usersRouter.put('/verify/:method/:id/:token', async (request, response) => {

  const { method, token } = request.params

  let precode = null

  let verifiedUser = null

  if(method === 'e'){
    precode = 'e'
    verifiedUser = {
      emailVerified: true
    }
  }
  else if(method === 'p'){
    precode = 'p'
    verifiedUser = {
      phoneVerified: true
    }
  }
  else{
    return response.status(400).json({ error: 'invalid verification method' })
  }

  if(token){
    const decodedToken = jwt.verify(token, config.SECRET)

    const registeredToken = await config.redisClient.get(`${precode}_${decodedToken.id}`)

    const user = await User.findById(decodedToken.id).exec()

    if (!user) {
      return response.status(404).json({ error: 'this account does not exist' })
    }
    if (!registeredToken || !crypto.timingSafeEqual(Buffer.from(registeredToken), Buffer.from(token))) {
      return response.status(401).json({ error: 'the token has expired' })
    }
    /* Doing that last part to avoid timing attacks */

    await User.findByIdAndUpdate(user.id, verifiedUser, {
      new: true,
      runValidators: true,
      context: 'query'
    }).exec()

    await config.redisClient.del(`${precode}_${decodedToken.id}`)

    response.status(204).end()

  }
  else{
    return response.status(404).json({ error: 'token missing or invalid' })
  }

})

module.exports = usersRouter
