require('dotenv').config()
const redis = require('redis')

const PORT = process.env.PORT

const MONGODB_URI = process.env.MONGODB_URI

const SECRET = process.env.SECRET

const initializeRedis = () => {
  if (process.env.NODE_ENV === 'development') {
    const redisClient = redis.createClient()
    redisClient.on('error', (err) => console.log('Redis Client Error', err))
    return redisClient
  }
  else if (process.env.NODE_ENV === 'production') {
    const redisClient = redis.createClient(process.env.REDISCLOUD_URL, { no_ready_check: true })
    redisClient.on('error', (err) => console.log('Redis Client Error', err))
    return redisClient
  }
}

const redisClient = initializeRedis()

module.exports = {
  MONGODB_URI,
  redisClient,
  PORT,
  SECRET
}