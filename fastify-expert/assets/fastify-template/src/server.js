const buildApp = require('./app')
const config = require('./config')

const closeListeners = []

async function start() {
  const app = await buildApp()

  try {
    await app.listen({
      port: config.port,
      host: config.host
    })

    app.log.info(`Server listening on ${config.host}:${config.port}`)
    app.log.info(`Environment: ${config.env}`)
    app.log.info(`API Documentation: http://${config.host}:${config.port}/docs`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }

  // Graceful shutdown
  async function closeGracefully(signal) {
    app.log.info(`Received signal ${signal}, closing gracefully`)

    await app.close()

    for (const listener of closeListeners) {
      await listener()
    }

    process.exit(0)
  }

  process.on('SIGINT', closeGracefully)
  process.on('SIGTERM', closeGracefully)

  return app
}

start()
