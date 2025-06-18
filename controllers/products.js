const productsRouter = require('express').Router()
const Product = require('../models/product')
const { userExtractor, productValidator } = require('../utils/middleware')
const Seller = require('../models/seller')

productsRouter.get('/', async (request, response) => {
  const products = await Product.find({}).exec()
  response.json(products)
})

productsRouter.post('/', userExtractor, async (request, response) => {
  const { name, price, unit, quantity, description, photo } = request.body

  if (request.user.type !== 'seller') {
    return response.status(403).json({
      error: 'user must be a seller'
    })
  }

  const seller = request.user

  const product = new Product({
    name: name, 
    price: price, 
    unit: unit, 
    quantity: quantity, 
    description: description, 
    photo: photo,
    seller: seller._id
  })
  
  const savedProduct = await product.save().exec()  
  
  const newSellerData = {
    catalog: [...seller.catalog, savedProduct._id]
  }
  
  const updatedSeller = await Seller.findByIdAndUpdate(seller._id, newSellerData, {
    new: true,
    runValidators: true,
    context: 'query'
  }).exec()

  response.status(201).json({savedProduct, updatedSeller})

})

productsRouter.delete( '/:id', userExtractor, productValidator, async (request, response) => {

  await Product.findByIdAndRemove(request.params.id).exec()

  const newSellerData = {
    catalog: [...request.user.catalog].filter((p) => p.toString() !== request.params.id)
  }

  await Seller.findByIdAndUpdate(request.user._id, newSellerData, {
    new: true,
    runValidators: true,
    context: 'query'
  }).exec()

  response.status(204).end()

})

productsRouter.put('/:id', userExtractor, productValidator, async (request, response) => {
  const { name, price, unit, quantity, description, photo } = request.body

  const receivedProduct = {
    name: name, 
    price: price, 
    unit: unit, 
    quantity: quantity, 
    description: description, 
    photo: photo,
  }

  const updatedProduct = await Product.findByIdAndUpdate(request.params.id, receivedProduct , {
    new: true,
    runValidators: true,
    context: 'query'
  }).exec()

  response.json(updatedProduct)

})

module.exports = productsRouter
