const mongoose = require('mongoose')

const serviceOfferSchema = new mongoose.Schema({
  price: {
    type: Number,
    required: [
      function() {
        return !this.NI
      },
      'A price must be provided unless a Inspection Request has been submitted'
    ]
  },
  NI: {
    type: Boolean,
    required: [
      function() {
        return !this.price
      },
      'A Inspection Request must be submitted if no price is provided'
    ]
  },
  contractor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contractor',
    required: true
  },
  serviceRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceRequest',
    required: true
  },
  contract: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contract'
  },
  cancelContract: {
    type: Boolean,
    required: true,
    validate: {
      validator: function (v) {
        return !(v && !this.contract)
      },
      message: 'A contract must exist before a cancel request is submitted'
    }
  }
})

serviceOfferSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

const ServiceOffer = mongoose.model('ServiceOffer', serviceOfferSchema)

module.exports = ServiceOffer
