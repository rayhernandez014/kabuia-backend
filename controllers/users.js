const usersRouter = require('express').Router()
const Customer = require('../models/customer')
const Contractor = require('../models/contractor')
const User = require('../models/user')
const config = require('../utils/config')
const { userExtractor, userValidator } = require('../utils/middleware')
const { validatePassword, hashPassword } = require('../utils/security')

usersRouter.get('/', userExtractor, async (request, response) => {
  const id = request.user._id.toString()
  const user = await User.findById( id ).exec()
  response.json(user)
})

usersRouter.post('/', async (request, response) => {
  const { firstname, lastname, email, phone, password, photo, stripeID, latitude, longitude, portfolio, skills, type } = request.body

  if (!validatePassword(password)) {
    return response.status(400).json({
      error: 'Password is not strong enough'
    })
  }

  let existingUser = await User.findOne({ email }).exec()
  if (existingUser?.email) {
    return response.status(400).json({ error: 'This email is already registered' })
  }

  existingUser = await Customer.findOne({ phone }).exec()
  if (existingUser?.phone) {
    return response.status(400).json({ error: 'This phone is already registered' })
  }

  const passwordHash = await hashPassword(password)

  if(type === 'customer'){
    const customer = new Customer({
      firstname: firstname,
      lastname: lastname,
      email: email,
      phone: phone,
      passwordHash: passwordHash,
      photo: photo ?? '',
      reviews: [],
      cancelationRatio: 0,
      stripeID: stripeID ?? '',
      longitude: longitude,
      latitude: latitude,
      serviceRequests: [],
    })

    const savedCustomer = await customer.save()
    response.status(201).json(savedCustomer)
  }
  else if (type === 'contractor'){
    const contractor = new Contractor({
      firstname: firstname,
      lastname: lastname,
      email: email,
      phone: phone,
      passwordHash: passwordHash,
      photo: photo ?? '',
      reviews: [],
      cancelationRatio: 0,
      stripeID: stripeID ?? '',
      longitude: longitude,
      latitude: latitude,
      portfolio: portfolio ?? '',
      skills: skills,
      serviceOffers: [],
    })

    const savedContractor = await contractor.save()
    response.status(201).json(savedContractor)
  }
  else{
    return response.status(400).json({ error: 'Invalid user type' })
  }

})

usersRouter.delete( '/:id', userExtractor, userValidator, async (request, response) => {

  await config.redisClient.del(request.params.id)

  await User.findByIdAndRemove(request.params.id).exec()
  response.status(204).end()

})

usersRouter.put('/:id', userExtractor, userValidator, async (request, response) => {
  const { firstname, lastname, photo, stripeID, latitude, longitude, portfolio, skills, type } = request.body

  if(type === 'customer'){
    const receivedCustomer = {
      firstname: firstname,
      lastname: lastname,
      photo: photo,
      stripeID: stripeID,
      latitude: latitude,
      longitude: longitude
    }

    const updatedCustomer = await Customer.findByIdAndUpdate(request.params.id, receivedCustomer, {
      new: true,
      runValidators: true,
      context: 'query'
    }).exec()
    response.json(updatedCustomer)
  }
  else if (type === 'contractor'){
    const receivedContractor = {
      firstname: firstname,
      lastname: lastname,
      photo: photo,
      stripeID: stripeID,
      latitude: latitude,
      longitude: longitude,
      portfolio: portfolio,
      skills: skills
    }

    const updatedContractor = await Contractor.findByIdAndUpdate(request.params.id, receivedContractor, {
      new: true,
      runValidators: true,
      context: 'query'
    }).exec()
    response.json(updatedContractor)
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
      error: 'Password is not strong enough'
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

  await config.redisClient.del(request.params.id.toString())

  response.status(204).end()
})

module.exports = usersRouter
