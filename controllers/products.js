const productsRouter = require('express').Router()
const Product = require('../models/product')
const { userExtractor, productValidator, roleValidator } = require('../utils/middleware')
const Seller = require('../models/seller')

productsRouter.get('/', async (request, response) => {
  const products = await Product.find({}).exec()
  response.json(products)
})

productsRouter.post('/', userExtractor, roleValidator(['Seller']), async (request, response) => {
  const { name, price, unit, stock, description, photo } = request.body

  const seller = request.user

  const product = new Product({
    name: name, 
    price: price, 
    unit: unit, 
    stock: stock, 
    description: description, 
    photo: photo,
    seller: seller._id
  })
  
  const savedProduct = await product.save() 

  seller.catalog = [...seller.catalog, savedProduct._id]

  const updatedSeller = await seller.save()

  response.status(201).json({savedProduct, updatedSeller})

})

productsRouter.delete( '/:id', userExtractor, productValidator, async (request, response) => {

  const seller = request.user

  await Product.findByIdAndRemove(request.params.id).exec()

  seller.catalog = [...request.user.catalog].filter((p) => p.toString() !== request.params.id)

  const updatedSeller = await seller.save()

  response.status(204).end()

})

productsRouter.put('/:id', userExtractor, productValidator, async (request, response) => {
  const { name, price, unit, stock, description, photo } = request.body

  const receivedProduct = {
    name: name, 
    price: price, 
    unit: unit, 
    stock: stock, 
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
