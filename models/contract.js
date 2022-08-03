const mongoose = require('mongoose')

const contractSchema = new mongoose.Schema({
  serviceRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'serviceRequest',
    required: true
  },
  serviceOffer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'serviceOffer',
    required: true
  },
  reviews: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'review'
  }],
  status: {
    type: String,
    required: true
  },
  album: String
})

contractSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

const Contract = mongoose.model('Contract', contractSchema)

module.exports = Contract
