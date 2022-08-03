const mongoose = require('mongoose')

const serviceOfferSchema = new mongoose.Schema({
  price: Number,
  NI: Boolean,
  contractor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'contractor'
  },
  serviceRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'serviceRequest',
    required: true
  },
  contract: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'contract'
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
