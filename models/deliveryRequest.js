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
    ref: 'Location',
    required: true
  },
  destination: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    required: true
  }, 
  date: {
    type: Date,
    required: true,
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller',
    required: true
  },
  deliveryOffers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'deliveryOffer',
    required: true
  }],
  selectedDeliveryOffer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'deliveryOffer',
  },
  status: {
    type: String,
    enum: ['awaiting_offers', 'offer_selected', 'offer_accepted', 'canceled'],
    default: 'awaiting_offers'
  },
  contract: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contract',
    required: true
  },
})

deliveryRequestSchema.pre('save', function (next) {
  if (this.isNew) {
    if(this.date){
      const isDate = this.date instanceof Date
      const isValidDate = !isNaN(this.date.getTime())
      const isFutureDate = this.date > new Date()
      if(!isDate || !isValidDate || !isFutureDate){
        return next(new Error('invalidDateError: date must be a valid date in the future'));
      }
    }
  }
  next()
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
