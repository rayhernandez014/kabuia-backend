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
    required: [
      function() {
        return !this.phone
      },
      'Email is required if phone number is not specified'
    ],
    validate: {
      validator: function (v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || (this.phone && !this.email)
      },
      message: props => `${props.value} is not a valid email`
    }
  },
  phone: {
    type: String,
    required: [
      function() {
        return !this.email
      },
      'Phone number is required if email is not specified'
    ],
    validate: {
      validator: function (v) {
        return /^\+?[1-9][0-9]{7,14}$/.test(v) || (this.email && !this.phone)
      },
      message: props => `${props.value} is not a valid phone number`
    }
  },
  passwordHash: {
    type: String,
    required: true
  },
  photo: String,
  serviceRequests: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceRequest'
  }],
  reviews: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review'
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
