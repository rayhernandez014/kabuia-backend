const mongoose = require('mongoose')
const User = require('./user')

const options = { discriminatorKey: 'type' }

const Contractor = User.discriminator('Contractor', new mongoose.Schema({

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

}, options))

module.exports = Contractor
