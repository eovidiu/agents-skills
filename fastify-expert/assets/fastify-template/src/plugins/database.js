const fp = require('fastify-plugin')
const { Pool } = require('pg')

async function databasePlugin(fastify, options) {
  const pool = new Pool({
    host: options.host,
    port: options.port,
    database: options.database,
    user: options.user,
    password: options.password,
    min: options.min || 2,
    max: options.max || 10,
    idleTimeoutMillis: options.idleTimeoutMillis || 30000,
    connectionTimeoutMillis: options.connectionTimeoutMillis || 2000,
    statement_timeout: options.statement_timeout || 5000,
    application_name: 'fastify-app'
  })

  // Test connection on startup
  try {
    const client = await pool.connect()
    fastify.log.info('Database connected successfully')
    client.release()
  } catch (err) {
    fastify.log.error({ err }, 'Failed to connect to database')
    throw err
  }

  // Monitor pool health
  pool.on('error', (err, client) => {
    fastify.log.error({ err }, 'Unexpected error on idle client')
  })

  pool.on('connect', () => {
    fastify.log.debug('New client connected to pool')
  })

  // Decorate Fastify instance
  fastify.decorate('db', pool)

  // Graceful shutdown
  fastify.addHook('onClose', async (instance) => {
    fastify.log.info('Closing database connections')
    await instance.db.end()
  })
}

module.exports = fp(databasePlugin, {
  name: 'database'
})
