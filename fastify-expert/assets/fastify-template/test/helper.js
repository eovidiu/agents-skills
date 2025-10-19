const buildApp = require('../src/app')

async function build(options = {}) {
  const app = await buildApp({
    logger: false,  // Disable logs in tests
    ...options
  })

  await app.ready()
  return app
}

async function cleanup(app) {
  await app.close()
}

module.exports = {
  build,
  cleanup
}
