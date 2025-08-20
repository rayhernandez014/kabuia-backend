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
  const { grade, description, recipient, contractId } = request.body

  const author = request.user

  const contract = await Contract.findById(contractId).exec()
    
  if(!contract){
    return response.status(404).json({
        error: 'contract does not exist'
    })
  }

  const participantsList = [contract.buyer, contract.seller]

  if(contract.type === 'ContractWithDelivery'){
    participantsList.push(contract.deliverer)
  }

  if(!participantsList.includes(author) || !participantsList.includes(recipient)){
    return response.status(403).json({
        error: 'you are not authorized to perform this action'
    })
  }

  const review = new Review({
    grade: grade,
    description: description,
    recipient: recipient,
    contract: contract._id,
    author: author._id,
    timestamp: new Date()
  })
  
  const savedReview = await review.save()  

  const updatedRecipient = await User.findByIdAndUpdate(recipient, {
    $push: { reviews: savedReview._id }
  }, {
    new: true,
    runValidators: true,
    context: 'query'
  }).exec()

  contract.reviews.push({
    reviews: savedReview._id
  })
  
  await contract.save()

  response.status(201).json({savedReview})

})

reviewsRouter.put('/:id', userExtractor, reviewValidator, async (request, response) => {
  const { grade, description } = request.body

  const review = request.review

  review.history.push({
    grade: review.grade,
    description: review.description,
    timestamp: review.timestamp
  })

  review.grade = grade
  review.description = description
  review.timestamp = new Date()

  const updatedReview = await review.save()

  response.json(updatedReview)

})

module.exports = reviewsRouter
