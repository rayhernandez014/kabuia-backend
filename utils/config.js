require('dotenv').config()
const { createClient } = require('redis');

const PORT = process.env.PORT

const MONGODB_URI = process.env.MONGODB_URI

const SECRET = process.env.SECRET

const REDIS_PASSWORD = process.env.REDIS_PASSWORD
const REDIS_HOST = process.env.REDIS_HOST
const REDIS_PORT = process.env.REDIS_PORT

const initializeRedis = () => {
  const redisClient = createClient({
    password: REDIS_PASSWORD,
    socket: {
      host: REDIS_HOST,
      port: REDIS_PORT
    }
  })
  redisClient.on('error', (err) => console.log('Redis Client Error: ', err))
  return redisClient
}

const redisClient = initializeRedis()

module.exports = {
  MONGODB_URI,
  redisClient,
  PORT,
  SECRET
}