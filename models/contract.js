const mongoose = require('mongoose')

const contractSchema = new mongoose.Schema({
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Buyer',
    required: true
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller',
    required: true
  },
  deliverer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deliverer',
    required: true
  },
  deliveryRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DeliveryRequest',
    required: true
  },
  deliveryOffer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DeliveryOffer',
    required: true
  },
  Products: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  }],
  reviews: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review'
  }],
  status: {
    type: Boolean,
    required: true
  }
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
