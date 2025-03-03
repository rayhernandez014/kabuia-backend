const mongoose = require('mongoose')
const Contract = require('./contract')
const options = { discriminatorKey: 'type' }

const ContractWithDelivery = Contract.discriminator('ContractWithDelivery', new mongoose.Schema({
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
}, options))

module.exports = ContractWithDelivery
