const express = require('express')
const helmet = require('helmet')
require('express-async-errors')
const cors = require('cors')
const bodyParser = require('body-parser')
const config = require('./utils/config')
const mongoose = require('mongoose')
const usersRouter = require('./controllers/users')
const loginRouter = require('./controllers/login')
const logoutRouter = require('./controllers/logout')
const forgotPassword = require('./controllers/forgotPassword')
const verifyUser = require('./controllers/verifyUser')
const locations = require('./controllers/locations')
const products = require('./controllers/products')
const contracts = require('./controllers/contracts')
const reviews = require('./controllers/reviews')
const deliveryRequests = require('./controllers/deliveryRequests')
const deliveryOffers = require('./controllers/deliveryOffers')
const payments = require('./controllers/payments')
const middleware = require('./utils/middleware')

const app = express()
app.use(helmet())

mongoose.connect(config.MONGODB_URI)

config.redisClient.connect()

app.use(cors())

//this is placed here and with that parser because this is not an ordinary api endpoint, it is used for the BTCpay server webhook.

app.use('/api/payments', [
  bodyParser.json({
    verify: (request, response, buf) => {
      request.rawBody = buf; // Store raw body as Buffer
    }
  }),
  payments
])

app.use(express.json())

app.use(middleware.requestLogger)

app.get('/', (request, response) => {
  response.send('<h1>Hello World!</h1>')
})

app.use('/api/users', usersRouter)
app.use('/api/login', loginRouter)
app.use('/api/logout', logoutRouter)
app.use('/api/forgot-password', forgotPassword)
app.use('/api/verify-user', verifyUser)
app.use('/api/locations', locations)
app.use('/api/products', products)
app.use('/api/contracts', contracts)
app.use('/api/reviews', reviews)
app.use('/api/delivery-requests', deliveryRequests)
app.use('/api/delivery-offers', deliveryOffers)

app.use(middleware.unknownEndpoint)
app.use(middleware.errorHandler)

module.exports = {app, mongoose}