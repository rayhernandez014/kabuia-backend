const mongoose = require('mongoose')

const reviewSchema = new mongoose.Schema({
  grade: {
    type: Number,
    required: true,
    min: 0,
    max: 5
  },
  description: {
    type: String,
    required: true,
    minLength: 10
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  contract: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contract',
    required: true
  },
  editHistory: [{
    grade: {
      type: Number,
      required: true,
      min: 0,
      max: 5
    },
    description: {
      type: String,
      required: true,
      minLength: 10
    },
  }]
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
