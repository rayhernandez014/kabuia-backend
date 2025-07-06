const reviewsRouter = require('express').Router()
const Contract = require('../models/contract')
const Review = require('../models/review')
const User = require('../models/user')
const { userExtractor, reviewValidator } = require('../utils/middleware')

reviewsRouter.get('/', async (request, response) => {
  const reviews = await Review.find({}).exec()
  response.json(reviews)
})

reviewsRouter.post('/', userExtractor, async (request, response) => {
  const { grade, description, recipient, contract } = request.body

  const author = request.user

  const review = new Review({
    grade: grade,
    description: description,
    recipient: recipient,
    contract: contract,
    author: author._id
  })
  
  const savedReview = await review.save()  

  const updatedRecipient = await User.findByIdAndUpdate(recipient, {
    $push: { reviews: savedReview._id }
  }, {
    new: true,
    runValidators: true,
    context: 'query'
  }).exec()
  
  const updatedContract = await Contract.findByIdAndUpdate(contract, {
    $push: { reviews: savedReview._id }
  }, {
    new: true,
    runValidators: true,
    context: 'query'
  }).exec()

  response.status(201).json({savedReview})

})

reviewsRouter.put('/:id', userExtractor, reviewValidator, async (request, response) => {
  const { grade, description } = request.body

  const review = request.review

  review.editHistory.push({
    grade: review.grade,
    description: review.description,
    editedAt: new Date()
  })

  review.grade = grade
  review.description = description

  const updatedReview = await review.save()

  response.json(updatedReview)

})

module.exports = reviewsRouter
