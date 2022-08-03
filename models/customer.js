const mongoose = require('mongoose')

const customerSchema = new mongoose.Schema({
  firstname: {
    type: String,
    required: true,
    minLength: 3
  },
  lastname: {
    type: String,
    required: true,
    minLength: 3
  },
  email: {
    type: String,
    validate: {
      validator: (v) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
      },
      message: props => `"${props.value}" is not a valid email`
    },
    required: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  photo: String,
  serviceRequests: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'serviceRequest'
  }],
  reviews: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'review'
  }],
  cancelationRatio: {
    type: Number,
    required: true
  },
  stripeID: String
})

customerSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
    // the passwordHash should not be revealed
    delete returnedObject.passwordHash
  }
})

const Customer = mongoose.model('Customer', customerSchema)

module.exports = Customer
