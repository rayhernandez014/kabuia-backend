const mongoose = require('mongoose')
const User = require('./user')

const options = { discriminatorKey: 'type' }

const Seller = User.discriminator('Seller', new mongoose.Schema({
  catalog: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  }],
  deliveryRequests: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DeliveryRequest'
  }]
}, options))

module.exports = Seller
