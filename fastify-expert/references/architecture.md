# Fastify Architecture & Plugin System

## Plugin System Mastery

### Core Concepts

**Encapsulation**: Fastify plugins create isolated scopes. Decorators, hooks, and routes registered within a plugin are only available to that plugin and its children unless `fastify-plugin` is used.

```javascript
// Standard plugin - creates isolated scope
async function myPlugin(fastify, options) {
  // Only available in this plugin and children
  fastify.decorate('myUtility', () => {})

  fastify.get('/plugin-route', async () => {
    return { hello: 'from plugin' }
  })
}

// Using fastify-plugin - breaks encapsulation
const fp = require('fastify-plugin')

async function globalPlugin(fastify, options) {
  // Available to parent and sibling plugins
  fastify.decorate('globalUtility', () => {})
}

module.exports = fp(globalPlugin)
```

### When to Use `fastify-plugin`

**Use `fastify-plugin` when**:
- Creating utility decorators needed across the application
- Registering global hooks
- Setting up database connections, logging, or other infrastructure
- Building reusable libraries for multiple projects

**DON'T use `fastify-plugin` when**:
- Building feature modules (routes + business logic)
- Creating domain-specific plugins
- You need route prefixing or isolation

### Scope Inheritance Pattern

```javascript
// Root level
const fastify = require('fastify')()

// Plugin A - isolated scope
fastify.register(async function pluginA(fastify) {
  fastify.decorate('utilA', () => {})

  // Plugin B - child of A, can access utilA
  fastify.register(async function pluginB(fastify) {
    fastify.log.info(typeof fastify.utilA) // 'function'
  })
})

// Plugin C - sibling to A, CANNOT access utilA
fastify.register(async function pluginC(fastify) {
  fastify.log.info(typeof fastify.utilA) // 'undefined'
})
```

### Plugin Composition Patterns

#### 1. Feature Plugin Pattern
```javascript
// plugins/users/index.js
async function usersPlugin(fastify, options) {
  // Register schemas first
  fastify.addSchema({
    $id: 'user',
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      email: { type: 'string', format: 'email' },
      name: { type: 'string', minLength: 1 }
    }
  })

  // Register routes
  fastify.register(require('./routes'), { prefix: '/users' })

  // Register services
  fastify.decorate('userService', require('./service'))
}

module.exports = usersPlugin
```

#### 2. Infrastructure Plugin Pattern
```javascript
// plugins/database.js
const fp = require('fastify-plugin')
const { Pool } = require('pg')

async function databasePlugin(fastify, options) {
  const pool = new Pool(options.pg)

  // Decorate with database connection
  fastify.decorate('db', pool)

  // Graceful shutdown
  fastify.addHook('onClose', async (instance) => {
    await instance.db.end()
  })
}

module.exports = fp(databasePlugin, {
  name: 'database',
  dependencies: ['config'] // Ensure config loads first
})
```

#### 3. Auto-Loading Pattern
```javascript
// app.js
const autoload = require('@fastify/autoload')
const path = require('path')

fastify.register(autoload, {
  dir: path.join(__dirname, 'plugins'),
  options: { prefix: '/api' }
})
```

## Decorator Pattern

Decorators extend the Fastify instance with custom properties and methods. This differs from Express middleware.

### Types of Decorators

```javascript
// 1. Instance decorator (fastify object)
fastify.decorate('utility', function() {
  return 'value'
})

// 2. Request decorator
fastify.decorateRequest('user', null)

// Later in a hook or handler:
request.user = await getUserFromToken(request.headers.authorization)

// 3. Reply decorator
fastify.decorateReply('success', function(data) {
  this.send({ success: true, data })
})

// Usage:
async function handler(request, reply) {
  reply.success({ message: 'Done' })
}
```

### Decorator Dependencies

```javascript
fastify.decorate('database', db)

// Ensure 'database' exists before decorating
fastify.decorate('userRepo', {
  getter() {
    return {
      findById: (id) => this.database.query('SELECT * FROM users WHERE id = $1', [id])
    }
  }
})

// Check dependencies explicitly
if (!fastify.hasDecorator('database')) {
  throw new Error('database decorator is required')
}
```

## Route Prefixing Strategies

### Hierarchical Prefixing
```javascript
// app.js
fastify.register(require('./api'), { prefix: '/api' })

// api/index.js
async function apiPlugin(fastify) {
  fastify.register(require('./v1'), { prefix: '/v1' })
  fastify.register(require('./v2'), { prefix: '/v2' })
}

// api/v1/index.js
async function v1Plugin(fastify) {
  fastify.register(require('./users'), { prefix: '/users' })
  // Results in: /api/v1/users
}
```

### Configuration-Based Prefixing
```javascript
async function plugin(fastify, options) {
  const prefix = options.prefix || ''

  fastify.get(`${prefix}/health`, async () => {
    return { status: 'ok' }
  })
}

fastify.register(plugin, { prefix: process.env.API_PREFIX })
```

## Content Type Parsers

Custom parsers for non-JSON content types.

### XML Parser Example
```javascript
fastify.addContentTypeParser('application/xml', { parseAs: 'string' }, async (req, body) => {
  const xml2js = require('xml2js')
  const parser = new xml2js.Parser()

  try {
    const result = await parser.parseStringPromise(body)
    return result
  } catch (err) {
    throw new Error('Invalid XML')
  }
})

fastify.post('/xml-endpoint', {
  schema: {
    body: {
      type: 'object'
      // Define expected structure
    }
  }
}, async (request, reply) => {
  // request.body is parsed XML
  return { received: request.body }
})
```

### Binary Parser Example
```javascript
fastify.addContentTypeParser('application/octet-stream', async (request, payload) => {
  const chunks = []

  for await (const chunk of payload) {
    chunks.push(chunk)
  }

  return Buffer.concat(chunks)
})
```

### Removing Default Parser
```javascript
// Remove JSON parser to implement custom logic
fastify.removeContentTypeParser('application/json')

fastify.addContentTypeParser('application/json', { parseAs: 'string' }, async (req, body) => {
  try {
    return JSON.parse(body)
  } catch (err) {
    // Custom error handling
    throw new Error('Invalid JSON payload')
  }
})
```

## Lifecycle Hooks Order

Understanding hook execution order is critical for proper middleware-like behavior:

```
Incoming Request
    │
    ├─▶ onRequest (1)
    │
    ├─▶ preParsing (2)
    │
    ├─▶ preValidation (3)
    │
    ├─▶ preHandler (4)
    │
    ├─▶ Handler
    │
    ├─▶ preSerialization (5)
    │
    ├─▶ onSend (6)
    │
    └─▶ onResponse (7)

If error occurs:
    └─▶ onError

On server close:
    └─▶ onClose
```

### Hook Use Cases

```javascript
// onRequest - earliest hook, for logging/rate limiting
fastify.addHook('onRequest', async (request, reply) => {
  request.startTime = Date.now()
})

// preValidation - after parsing, before validation
// Good for authentication
fastify.addHook('preValidation', async (request, reply) => {
  const token = request.headers.authorization
  if (!token) throw new Error('Unauthorized')
  request.user = await verifyToken(token)
})

// preHandler - after validation, before handler
// Good for authorization
fastify.addHook('preHandler', async (request, reply) => {
  if (!request.user.canAccessResource(request.params.id)) {
    throw new Error('Forbidden')
  }
})

// onResponse - after response sent
// Good for logging, metrics
fastify.addHook('onResponse', async (request, reply) => {
  const duration = Date.now() - request.startTime
  fastify.log.info({
    url: request.url,
    duration,
    statusCode: reply.statusCode
  })
})

// onError - on error
fastify.addHook('onError', async (request, reply, error) => {
  // Send to error tracking service
  errorTracker.captureException(error, {
    user: request.user?.id,
    url: request.url
  })
})
```

## Testing Strategies

### Testing Without Server Startup

```javascript
// test/routes/users.test.js
const { build } = require('../helper')

describe('User routes', () => {
  let app

  beforeAll(async () => {
    app = await build()
  })

  afterAll(async () => {
    await app.close()
  })

  test('GET /users returns 200', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/users'
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toHaveProperty('users')
  })
})

// test/helper.js
const Fastify = require('fastify')
const app = require('../app')

function build() {
  const fastify = Fastify({
    logger: false // Disable for tests
  })

  // Don't listen, just register
  fastify.register(app)

  return fastify.ready()
}

module.exports = { build }
```

### Mocking Decorators

```javascript
test('Route with mocked database', async () => {
  const app = Fastify()

  // Mock database decorator
  app.decorate('db', {
    query: jest.fn().mockResolvedValue({ rows: [] })
  })

  app.register(require('../routes/users'))

  await app.ready()

  const response = await app.inject({
    method: 'GET',
    url: '/users'
  })

  expect(app.db.query).toHaveBeenCalled()
})
```

## Advanced Plugin Patterns

### Plugin with Cleanup

```javascript
async function cachePlugin(fastify, options) {
  const redis = new Redis(options.redis)

  fastify.decorate('cache', {
    get: async (key) => redis.get(key),
    set: async (key, value, ttl) => redis.setex(key, ttl, value)
  })

  // Cleanup on close
  fastify.addHook('onClose', async (instance) => {
    await redis.quit()
  })
}
```

### Plugin with Schema Registration

```javascript
async function schemasPlugin(fastify) {
  // Shared schemas across routes
  const schemas = {
    error: {
      $id: 'error',
      type: 'object',
      properties: {
        statusCode: { type: 'number' },
        error: { type: 'string' },
        message: { type: 'string' }
      }
    },
    user: {
      $id: 'user',
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        email: { type: 'string', format: 'email' }
      }
    }
  }

  for (const schema of Object.values(schemas)) {
    fastify.addSchema(schema)
  }
}

module.exports = fp(schemasPlugin, { name: 'schemas' })
```
