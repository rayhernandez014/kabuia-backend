const mongoose = require('mongoose')

const deliveryOfferSchema = new mongoose.Schema({
  price: {
    type: Number,
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
  contract: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contract'
  },
})

deliveryOfferSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

const DeliveryOffer = mongoose.model('DeliveryOffer', deliveryOfferSchema)

module.exports = DeliveryOffer
