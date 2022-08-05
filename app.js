const express = require('express')
const helmet = require('helmet')
require('express-async-errors')
const cors = require('cors')
const config = require('./utils/config')
const mongoose = require('mongoose')
const customersRouter = require('./controllers/customers')
const contractorsRouter = require('./controllers/contractors')
const customerLogin = require('./controllers/customerLogin')
const customerLogout = require('./controllers/customerLogout')
const middleware = require('./utils/middleware')
const logger = require('./utils/logger')

const app = express()
app.use(helmet())

mongoose.connect(config.MONGODB_URI)

config.redisClient.connect()

app.use(cors())
app.use(express.json())

app.use(middleware.requestLogger)

app.get('/', (request, response) => {
  response.send('<h1>Hello World!</h1>')
})

app.use('/api/customers', customersRouter)
app.use('/api/contractors', contractorsRouter)
app.use('/api/customerLogin', customerLogin)
app.use('/api/customerLogout', customerLogout)

app.use(middleware.unknownEndpoint)
app.use(middleware.errorHandler)


process.on('SIGINT', async () => {
  mongoose.connection.close( () => {
    logger.info('Mongoose disconnected on app termination')
    process.exit(0)
  })
  config.redisClient.quit()
})

module.exports = app