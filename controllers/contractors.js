const bcrypt = require('bcrypt')
const contractorsRouter = require('express').Router()
const Contractor = require('../models/contractor')

contractorsRouter.get('/', async (request, response) => {
  const contractors = await Contractor.find({})
  response.json(contractors)
})

contractorsRouter.post('/', async (request, response) => {
  const { firstname, lastname, email, password, photo, portfolio } = request.body

  const stripeID = ''

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
    photo: photo ?? '',
    portfolio: portfolio ?? '',
    serviceRequests: [],
    reviews: [],
    cancelationRatio: 0,
    stripeID: stripeID ?? ''
  })

  const savedContractor = await contractor.save()

  response.status(201).json(savedContractor)
})

contractorsRouter.delete( '/:id', async (request, response) => {

  await Contractor.findByIdAndRemove(request.params.id)
  response.status(204).end()

})

contractorsRouter.put('/:id', async (request, response) => {
  const body = request.body

  const receivedContractor = {
    firstname: body.firstname,
    lastname: body.lastname,
    photo: body.photo,
    stripeID: body.stripeID
  }

  const updatedContractor = await Contractor.findByIdAndUpdate(request.params.id, receivedContractor, {
    new: true,
    runValidators: true,
    context: 'query'
  })
  response.json(updatedContractor)
})
module.exports = contractorsRouter
