const mongoose = require('mongoose')
const Contract = require('./contract')
const options = { discriminatorKey: 'type' }

//Had to define this subtype slightly different because the "required" functions do not work well with parent properties, so I had to use pre('save').

const contractWithDeliverySchema = new mongoose.Schema({
  deliverer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deliverer',
  },
  deliveryRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DeliveryRequest',
  },
  deliveryRequestHistory: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DeliveryRequest',
  }],
  deliveryOffer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DeliveryOffer',
  },
  deliveryLocation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    required: true
  }
}, options)

contractWithDeliverySchema.pre('save', function (next) {
  if(this.history[3]?.status === 'delivering'){
    if(!this.deliverer){
      return next(new Error('deliverer is required before delivering the order'))
    }
    if(!this.deliveryRequest){
      return next(new Error('delivery request is required before delivering the order'))
    }
    if(!this.deliveryOffer){
      return next(new Error('delivery offer is required before delivering the order'))
    }
  }
  next()
})

const ContractWithDelivery = Contract.discriminator('ContractWithDelivery', contractWithDeliverySchema)

module.exports = ContractWithDelivery
