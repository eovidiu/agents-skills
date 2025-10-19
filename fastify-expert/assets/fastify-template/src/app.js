const fastify = require('fastify')
const config = require('./config')

async function buildApp(options = {}) {
  const app = fastify({
    logger: options.logger !== false ? config.logger : false,
    requestIdHeader: 'x-correlation-id',
    requestIdLogLabel: 'correlationId',
    ...options
  })

  // Register infrastructure plugins
  await app.register(require('@fastify/helmet'), {
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false
  })

  await app.register(require('@fastify/cors'), config.cors)

  await app.register(require('@fastify/rate-limit'), {
    max: config.rateLimit.max,
    timeWindow: config.rateLimit.timeWindow
  })

  await app.register(require('@fastify/jwt'), config.jwt)

  // Register custom plugins
  await app.register(require('./plugins/database'), config.database)
  await app.register(require('./plugins/auth'))
  await app.register(require('./plugins/hooks'))

  // Register API documentation
  await app.register(require('@fastify/swagger'), {
    openapi: {
      info: {
        title: 'Fastify API',
        description: 'API documentation',
        version: '1.0.0'
      },
      servers: [
        { url: `http://localhost:${config.port}`, description: 'Development' }
      ]
    }
  })

  await app.register(require('@fastify/swagger-ui'), {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false
    }
  })

  // Health checks
  app.get('/health/live', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() }
  })

  app.get('/health/ready', async (request, reply) => {
    try {
      await app.db.query('SELECT 1')
      return { status: 'ready', timestamp: new Date().toISOString() }
    } catch (err) {
      reply.code(503)
      return { status: 'not ready', error: err.message }
    }
  })

  // Register feature modules
  await app.register(require('./features/users'), { prefix: '/api/users' })

  // Global error handler
  app.setErrorHandler((error, request, reply) => {
    request.log.error({
      err: error,
      url: request.url,
      correlationId: request.id
    }, 'Request error')

    // Validation errors
    if (error.validation) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Validation failed',
        details: error.validation,
        correlationId: request.id
      })
    }

    // Custom errors
    const statusCode = error.statusCode || 500

    reply.status(statusCode).send({
      statusCode,
      error: error.name || 'Internal Server Error',
      message: process.env.NODE_ENV === 'production'
        ? 'An error occurred'
        : error.message,
      correlationId: request.id
    })
  })

  return app
}

module.exports = buildApp
