const mongoose = require('mongoose')

const deliveryRequestSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    minLength: 3
  },
  description: {
    type: String,
  },
  origin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coordinates',
    required: true
  },
  destination: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coordinates',
    required: true
  }, 
  date: {
    type: Date,
    required: true
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller',
    required: true
  },
  deliveryOffers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'deliveryOffer'
  }],
  contract: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contract'
  },
})

deliveryRequestSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

const DeliveryRequest = mongoose.model('DeliveryRequest', deliveryRequestSchema)

module.exports = DeliveryRequest
