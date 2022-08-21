const mongoose = require('mongoose')

const reviewSchema = new mongoose.Schema({
  grade: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true,
    minLength: 10
  },
  type: {
    type: String,
    required: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  contractor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contractor',
    required: true
  },
  contract: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contract',
    required: true
  }
})

reviewSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

const Review = mongoose.model('Review',reviewSchema)

module.exports = Review
