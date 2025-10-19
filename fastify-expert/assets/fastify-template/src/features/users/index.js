async function usersPlugin(fastify, options) {
  // Register routes
  await fastify.register(require('./routes'))
}

module.exports = usersPlugin
