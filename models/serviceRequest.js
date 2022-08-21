const mongoose = require('mongoose')

const serviceRequestSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    minLength: 3
  },
  description: {
    type: String,
    required: true,
    minLength: 10
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  album: String,
  TSD: {
    type: Date,
    required: true
  },
  serviceOffers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceOffer'
  }],
  contract: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contract'
  }
})

serviceRequestSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

const ServiceRequest = mongoose.model('ServiceRequest', serviceRequestSchema)

module.exports = ServiceRequest
