const mongoose = require('mongoose')

const options = { discriminatorKey: 'type' }

const contractSchema = new mongoose.Schema({
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Buyer',
    required: true
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller',
    required: true
  },
  order: {
    items: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    }],
    quantities: {
      type: [Number],
      required: true
    },
    total: {
      type: [Number],
      required: true
    }
  },
  reviews: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review'
  }],
  statusHistory: {
    type: [String],
    required: true,
    validate: {
      validator: function (v) {
        const standard = new Set(['placed', 'preparing', 'ready', 'delivering', 'delivered', 'picked_up', 'canceled'])
        const receivedSet = new Set (v)
        return receivedSet.isSubsetOf(standard)
      },
      message: props => 'last contract status is invalid'
    } 
  },
  statusTimestamps: {
    type: [Date],
    required: true
  },
  expectedReadyDate: {
    type: Date,
    required: true
  },
}, options)

contractSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

const Contract = mongoose.model('Contract', contractSchema)

module.exports = Contract
