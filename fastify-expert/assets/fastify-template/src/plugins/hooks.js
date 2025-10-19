const fp = require('fastify-plugin')

async function hooksPlugin(fastify, options) {
  // Request timing
  fastify.addHook('onRequest', async (request) => {
    request.startTime = Date.now()
  })

  // Request logging with duration
  fastify.addHook('onResponse', async (request, reply) => {
    const duration = Date.now() - request.startTime

    request.log.info({
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      duration,
      correlationId: request.id
    }, 'Request completed')

    // Warn on slow requests
    if (duration > 1000) {
      request.log.warn({
        msg: 'Slow request detected',
        duration,
        url: request.url,
        correlationId: request.id
      })
    }
  })

  // Error logging
  fastify.addHook('onError', async (request, reply, error) => {
    request.log.error({
      err: error,
      url: request.url,
      correlationId: request.id
    }, 'Request error occurred')
  })
}

module.exports = fp(hooksPlugin, {
  name: 'hooks'
})
