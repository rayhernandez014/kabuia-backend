const mongoose = require('mongoose')
const User = require('./user')

const options = { discriminatorKey: 'type' }

const Buyer = User.discriminator('Buyer', new mongoose.Schema({
  shoppingCart: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  }],
}, options))

module.exports = Buyer
