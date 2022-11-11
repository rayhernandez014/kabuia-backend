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
  photo: {
    type: String
  },
  portfolio: {
    type: [String]
  },
  skills: {
    type: [String],
    required: true,
    validate: {
      validator: function (v) {
        const validSkills = ['carpenter', 'driver']
        let skillIsValid = true
        for (const skill of v) {
          if (!validSkills.includes(skill)){
            skillIsValid = false
            break
          }
        }
        return v.length && skillIsValid
      },
      message: 'Please provide at least one skill'
    }
  },
  serviceOffers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceOffer'
  }],
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
