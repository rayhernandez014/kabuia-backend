const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
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
      'email is required if phone number is not specified'
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
      'phone number is required if email is not specified'
    ],
    validate: {
      validator: function (v) {
        return /^\+?[1-9][0-9]{7,14}$/.test(v) || (this.email && !this.phone)
      },
      message: props => `${props.value} is not a valid phone number`
    }
  },
  emailVerified: {
    type: Boolean,
    required: [
      function() {
        return !!this.email
      },
      'email verification status is required if an email is provided'
    ],
  },
  phoneVerified: {
    type: Boolean,
    required: [
      function() {
        return !!this.phone
      },
      'phone verification status is required if an phone is provided'
    ],
  },
  passwordHash: {
    type: String,
    required: true
  },
  photo: {
    type: String
  },
  reviews: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review'
  }],
  stripeID: {
    type: String
  },
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  }
})

userSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
    // the passwordHash should not be revealed
    delete returnedObject.passwordHash
  }
})

const User = mongoose.model('User', userSchema)

module.exports = User
