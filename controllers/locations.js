const locationsRouter = require('express').Router()
const Location = require('../models/location')
const User = require('../models/user')
const { userExtractor, locationValidator } = require('../utils/middleware')

locationsRouter.get('/', async (request, response) => {
  const location = await Location.find({}).exec()
  response.json(location)
})

locationsRouter.post('/', userExtractor, async (request, response) => {
  const { latitude, longitude } = request.body

  const user = request.user

  const location = new Location({
    latitude: latitude,
    longitude: longitude,
    user: user._id
  })
  
  const savedLocation = await location.save()

  const updatedUser = await User.findByIdAndUpdate(user._id, {
    $push: { locations: savedLocation._id }
  }, {
    new: true,
    runValidators: true,
    context: 'query'
  }).exec()

  response.status(201).json({savedLocation})

})

locationsRouter.put('/:id', userExtractor, locationValidator, async (request, response) => {
  const { latitude, longitude } = request.body

  const location = request.location

  location.latitude = latitude
  location.longitude = longitude

  const updatedLocation = await location.save()

  response.json(updatedLocation)

})

module.exports = locationsRouter
