const mongoose = require('mongoose')
const Contract = require('./contract')
const options = { discriminatorKey: 'type' }

const ContractWithPickup = Contract.discriminator('ContractWithPickup', new mongoose.Schema({
  pickupLocation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    required: true
  },
}, options))

module.exports = ContractWithPickup
