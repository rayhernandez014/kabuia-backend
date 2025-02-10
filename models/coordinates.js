const mongoose = require('mongoose')

const coordinatesSchema = new mongoose.Schema({
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  }
})

coordinatesSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

const Coordinates = mongoose.model('Coordinates', coordinatesSchemaSchema)

module.exports = Coordinates
