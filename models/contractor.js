const mongoose = require('mongoose')

const contractorSchema = new mongoose.Schema({
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
      message: props => `${props.value} is not a valid email`
    },
    required: true
  },
  phone: {
    type: String,
    required: [
      () => this.email.checkRequired(),
      'Phone number is required if email is not specified'
    ]
  },
  passwordHash: {
    type: String,
    required: true
  },
  photo: String,
  portfolio: String,
  skills: {
    type: [String],
    required: true
  },
  serviceOffers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceOffer'
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

contractorSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
    // the passwordHash should not be revealed
    delete returnedObject.passwordHash
  }
})

const Contractor = mongoose.model('Contractor', contractorSchema)

module.exports = Contractor
