const mongoose = require('mongoose')
const User = require('./user')

const options = { discriminatorKey: 'type' }

const Customer = User.discriminator('Customer', new mongoose.Schema({

  serviceRequests: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceRequest'
  }],

}, options))

module.exports = Customer
