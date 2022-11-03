const mongoose = require('mongoose')

const contractSchema = new mongoose.Schema({
  serviceRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceRequest',
    required: true
  },
  serviceOffer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceOffer',
    required: true
  },
  reviews: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review'
  }],
  status: {
    type: Boolean,
    required: true
  },
  album: {
    type: [String]
  },
  customerCancelRequest: {
    type: Boolean,
    required: true
  },
  contractorCancelRequest: {
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
