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
  history:[{
    status: {
      type: String,
      required: true,
      validate: {
        validator: function (v) {
          const standard = ['placed', 'preparing', 'ready', 'delivering', 'delivered', 'picked_up', 'canceled']
          return standard.includes(v)
        },
        message: props => 'new contract status is invalid'
      } 
    },
    timestamp: {
      type: [Date],
      required: true,
      validate: {
        validator: function (v) {        
          return v instanceof Date && !isNaN(v.getTime())
        },
        message: props => 'new timestamp is invalid'
      }
    },
  }],  
  expectedReadyDate: {
    type: Date,
    required: true,
    validate: {
      validator: function (value) {
        return value instanceof Date && !isNaN(value.getTime()) && value > new Date();
      },
      message: 'invalid date'
    }
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
