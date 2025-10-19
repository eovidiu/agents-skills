const schemas = require('./schemas')

async function userRoutes(fastify, options) {
  const service = require('./service')(fastify)

  // List users
  fastify.get('/', {
    schema: schemas.listUsersSchema
  }, async (request) => {
    return service.findAll(request.query)
  })

  // Get user by ID
  fastify.get('/:id', {
    schema: schemas.getUserSchema
  }, async (request) => {
    return service.findById(request.params.id)
  })

  // Create user
  fastify.post('/', {
    schema: schemas.createUserSchema
  }, async (request, reply) => {
    const user = await service.create(request.body)
    reply.code(201)
    return user
  })

  // Update user
  fastify.patch('/:id', {
    schema: schemas.updateUserSchema,
    onRequest: [fastify.authenticate]
  }, async (request) => {
    // Optional: check if user can only update their own profile
    // if (request.user.id !== request.params.id && request.user.role !== 'admin') {
    //   throw new ForbiddenError('Cannot update other users')
    // }

    return service.update(request.params.id, request.body)
  })

  // Delete user
  fastify.delete('/:id', {
    schema: schemas.deleteUserSchema,
    onRequest: [fastify.authorize('admin')]
  }, async (request, reply) => {
    await service.delete(request.params.id)
    reply.code(204).send()
  })

  // Login endpoint
  fastify.post('/login', {
    schema: {
      description: 'Login with email and password',
      tags: ['users', 'auth'],
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            user: schemas.User
          }
        }
      }
    }
  }, async (request, reply) => {
    const { email, password } = request.body
    const user = await service.authenticate(email, password)

    const token = fastify.jwt.sign({
      id: user.id,
      email: user.email,
      role: 'user'  // Add role from database if available
    })

    return { token, user }
  })
}

module.exports = userRoutes
