const customerLogoutRouter = require('express').Router()
const config = require('../utils/config')
const middleware = require('../utils/middleware')

customerLogoutRouter.post('/', middleware.customerExtractor ,async (request, response) => {
  const { _id } = request.customer

  await config.redisClient.del(_id.toString())
  response.status(204).end()

})

module.exports = customerLogoutRouter