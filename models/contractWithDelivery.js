const mongoose = require('mongoose')
const Contract = require('./contract')
const options = { discriminatorKey: 'type' }

const ContractWithDelivery = Contract.discriminator('ContractWithDelivery', new mongoose.Schema({
  deliverer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deliverer',
    required: [
      function() {
        return this.history[3] === 'delivering'
      },
      'deliverer is required before delivering the order'
    ],
  },
  deliveryRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DeliveryRequest',
    required: [
      function() {
        return this.history[3] === 'delivering'
      },
      'delivery request is required before delivering the order'
    ],
  },
  deliveryOffer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DeliveryOffer',
    required: [
      function() {
        return this.history[3] === 'delivering'
      },
      'delivery offer is required before delivering the order'
    ],
  },
  deliveryLocation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    required: true
  },
}, options))

module.exports = ContractWithDelivery
