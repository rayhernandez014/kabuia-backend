const config = require('./utils/config')
const {app, mongoose} = require('./app')
const logger = require('./utils/logger')

const server = app.listen(config.PORT, () => {
  logger.info(`Server running on port ${config.PORT}`)
})

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

async function gracefulShutdown(signal) {
  console.log(`Received ${signal}. Closing server gracefully...`);
  try {
    server.close(() => {
      console.log('HTTP server closed.');
      mongoose.connection.close(false)
        .then(() => {
          console.log('MongoDB connection closed.');
          
          config.redisClient.quit()
            .then(() => {
                console.log('Redis connection closed.');
                process.exit(0);
              })
            .catch((err) => {
              console.error('Error closing Redis connection:', err);
              process.exit(1);
            });
        })
        .catch((err) => {
          console.error('Error closing MongoDB connection:', err);
          process.exit(1);
        });
      });
    setTimeout(() => {
      console.error('Forcefully shutting down after timeout.');
      process.exit(1);
    }, 10000);
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
}