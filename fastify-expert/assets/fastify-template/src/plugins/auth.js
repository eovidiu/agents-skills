const fp = require('fastify-plugin')

async function authPlugin(fastify, options) {
  // Authentication decorator
  fastify.decorate('authenticate', async function(request, reply) {
    try {
      await request.jwtVerify()
    } catch (err) {
      reply.code(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid or missing token'
      })
    }
  })

  // Authorization decorator (role-based)
  fastify.decorate('authorize', (...allowedRoles) => {
    return async function(request, reply) {
      try {
        await request.jwtVerify()

        if (!request.user.role) {
          return reply.code(403).send({
            statusCode: 403,
            error: 'Forbidden',
            message: 'No role assigned'
          })
        }

        if (!allowedRoles.includes(request.user.role)) {
          return reply.code(403).send({
            statusCode: 403,
            error: 'Forbidden',
            message: 'Insufficient permissions'
          })
        }
      } catch (err) {
        reply.code(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Invalid or missing token'
        })
      }
    }
  })

  // Optional authentication (doesn't fail if no token)
  fastify.decorate('optionalAuth', async function(request, reply) {
    try {
      await request.jwtVerify()
    } catch (err) {
      // Don't throw, just continue without user
      request.user = null
    }
  })
}

module.exports = fp(authPlugin, {
  name: 'auth',
  dependencies: ['@fastify/jwt']
})
