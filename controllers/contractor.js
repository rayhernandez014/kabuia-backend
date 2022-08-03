const bcrypt = require('bcrypt')
const contractorRouter = require('express').Router()
const Contractor = require('../models/contractor')

contractorRouter.post('/', async (request, response) => {
  const { firstname, lastname, email, password, photo, portfolio, stripeID } = request.body

  if (!password) {
    return response.status(400).json({
      error: 'Password is missing'
    })
  } else if (password.length < 8) {
    return response.status(400).json({
      error: 'Password should be at least 8 characters long'
    })
  }

  const existingContractor = await Contractor.findOne({ email })
  if (existingContractor) {
    return response.status(400).json({ error: 'This email is already registered as a contractor' })
  }

  const saltRounds = 10
  const passwordHash = await bcrypt.hash(password, saltRounds)

  const contractor = new Contractor({
    firstname: firstname,
    lastname: lastname,
    email: email,
    passwordHash: passwordHash,
    photo: photo ?? null,
    portfolio: portfolio ?? null,
    serviceRequests: [],
    reviews: [],
    cancelationRatio: 0,
    stripeID: stripeID ?? null,
  })

  const savedContractor = await contractor.save()

  response.status(201).json(savedContractor)
})

contractorRouter.get('/', async (request, response) => {
  const contractors = await Contractor.find({})
  response.json(contractors)
})
module.exports = contractorRouter
