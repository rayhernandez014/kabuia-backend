const logoutRouter = require('express').Router()
const config = require('../utils/config')
const middleware = require('../utils/middleware')

logoutRouter.post('/', middleware.userExtractor, async (request, response) => {
  const { _id } = request.user

  await config.redisClient.del(`jwt_${_id.toString()}`)
  response.status(204).end()

})

module.exports = logoutRouter