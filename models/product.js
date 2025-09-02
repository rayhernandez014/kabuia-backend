const mongoose = require('mongoose')

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    minLength: 3
  },
  description: {
    type: String
  },
  price: {
    type: Number,
    required: true
  },
  unit: {
    type: String,
    required: true,
    enum: ['kg', 'g', 'lb', 'oz', 'l', 'ml', 'gal', 'fl oz', 'ud', 'paq']
  },
  stock: {
    type: Number,
    required: true,
  },
  reservedStock: {
    type: Number,
    default: 0
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller',
    required: true
  },
  photo: {
    type: String
  },
})

productSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

const Product = mongoose.model('Product', productSchema)

module.exports = Product
