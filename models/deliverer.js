const mongoose = require('mongoose')
const User = require('./user')

const options = { discriminatorKey: 'type' }

const Deliverer = User.discriminator('Deliverer', new mongoose.Schema({
  deliveryOffers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DeliveryOffer'
  }],
}, options))

module.exports = Deliverer
