# Fastify Patterns and Anti-Patterns

## Code Organization Patterns

### Feature-Based Structure

```
src/
├── app.js                    # Main application setup
├── server.js                 # Server startup
├── config/
│   ├── index.js             # Configuration loader
│   └── environments/
│       ├── development.js
│       ├── production.js
│       └── test.js
├── plugins/
│   ├── database.js          # Infrastructure plugins
│   ├── redis.js
│   ├── auth.js
│   └── cors.js
├── schemas/
│   ├── index.js             # Centralized schemas
│   ├── common/
│   ├── users/
│   └── posts/
├── features/                # Feature modules
│   ├── users/
│   │   ├── index.js        # Feature plugin
│   │   ├── routes.js       # HTTP routes
│   │   ├── service.js      # Business logic
│   │   ├── repository.js   # Data access
│   │   └── schemas.js      # Feature schemas
│   └── posts/
│       ├── index.js
│       ├── routes.js
│       ├── service.js
│       └── repository.js
└── lib/
    ├── errors.js           # Custom error classes
    ├── logger.js           # Logging utilities
    └── validators.js       # Custom validators
```

### Clean Plugin Architecture

```javascript
// features/users/index.js
async function usersPlugin(fastify, options) {
  // Register feature-specific decorators
  const userService = require('./service')(fastify)
  fastify.decorate('userService', userService)

  // Register routes with prefix
  await fastify.register(require('./routes'), {
    prefix: '/users'
  })
}

module.exports = usersPlugin

// features/users/routes.js
async function userRoutes(fastify, options) {
  const schemas = require('./schemas')

  fastify.get('/', {
    schema: schemas.list
  }, async (request, reply) => {
    const users = await fastify.userService.findAll(request.query)
    return { users }
  })

  fastify.get('/:id', {
    schema: schemas.get,
    onRequest: [fastify.authenticate]
  }, async (request) => {
    const user = await fastify.userService.findById(request.params.id)
    if (!user) throw new NotFoundError('User')
    return user
  })

  fastify.post('/', {
    schema: schemas.create
  }, async (request, reply) => {
    const user = await fastify.userService.create(request.body)
    reply.code(201)
    return user
  })
}

module.exports = userRoutes

// features/users/service.js
module.exports = (fastify) => {
  const repository = require('./repository')(fastify)

  return {
    async findAll(filters) {
      return repository.findAll(filters)
    },

    async findById(id) {
      return repository.findById(id)
    },

    async create(data) {
      // Validation, business logic
      const existingUser = await repository.findByEmail(data.email)
      if (existingUser) {
        throw new Error('Email already exists')
      }

      return repository.create(data)
    }
  }
}

// features/users/repository.js
module.exports = (fastify) => {
  return {
    async findAll(filters = {}) {
      const { limit = 10, offset = 0 } = filters
      const result = await fastify.db.query(
        'SELECT * FROM users LIMIT $1 OFFSET $2',
        [limit, offset]
      )
      return result.rows
    },

    async findById(id) {
      const result = await fastify.db.query(
        'SELECT * FROM users WHERE id = $1',
        [id]
      )
      return result.rows[0]
    },

    async findByEmail(email) {
      const result = await fastify.db.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      )
      return result.rows[0]
    },

    async create(data) {
      const result = await fastify.db.query(
        'INSERT INTO users (email, name) VALUES ($1, $2) RETURNING *',
        [data.email, data.name]
      )
      return result.rows[0]
    }
  }
}
```

### Separation of Concerns

```javascript
// app.js - Application setup
const fastify = require('fastify')
const config = require('./config')

async function buildApp(options = {}) {
  const app = fastify({
    logger: options.logger !== false ? config.logger : false,
    ...options
  })

  // Register plugins
  await app.register(require('./plugins/database'), config.database)
  await app.register(require('./plugins/redis'), config.redis)
  await app.register(require('./plugins/auth'))

  // Register features
  await app.register(require('./features/users'))
  await app.register(require('./features/posts'))

  return app
}

module.exports = buildApp

// server.js - Server startup
const buildApp = require('./app')
const config = require('./config')

async function start() {
  const app = await buildApp()

  try {
    await app.listen({
      port: config.port,
      host: config.host
    })

    app.log.info(`Server listening on ${config.host}:${config.port}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
```

## Testing Strategies

### Testing Without Server Startup

```javascript
// test/helper.js
const buildApp = require('../app')

async function build(options = {}) {
  const app = await buildApp({
    logger: false,  // Disable logs in tests
    ...options
  })

  // Mock external dependencies
  app.decorate('externalApi', {
    fetchData: jest.fn().mockResolvedValue({ data: 'mocked' })
  })

  await app.ready()
  return app
}

module.exports = { build }

// test/features/users/routes.test.js
const { build } = require('../../helper')

describe('User routes', () => {
  let app

  beforeAll(async () => {
    app = await build()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('GET /users', () => {
    it('returns 200', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/users'
      })

      expect(response.statusCode).toBe(200)
      expect(response.json()).toHaveProperty('users')
    })

    it('supports pagination', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/users?limit=5&offset=10'
      })

      expect(response.statusCode).toBe(200)
    })
  })

  describe('POST /users', () => {
    it('creates user with valid data', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/users',
        payload: {
          email: 'test@example.com',
          name: 'Test User'
        }
      })

      expect(response.statusCode).toBe(201)
      expect(response.json()).toMatchObject({
        email: 'test@example.com',
        name: 'Test User'
      })
    })

    it('rejects invalid email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/users',
        payload: {
          email: 'invalid-email',
          name: 'Test User'
        }
      })

      expect(response.statusCode).toBe(400)
    })
  })
})
```

### Integration Testing with Real Database

```javascript
// test/integration/users.test.js
const { build } = require('../helper')
const { migrate, seed, cleanup } = require('../db-helper')

describe('User integration tests', () => {
  let app

  beforeAll(async () => {
    await migrate()  // Run migrations
    await seed()     // Seed test data

    app = await build({
      // Use test database
      database: {
        connectionString: process.env.TEST_DATABASE_URL
      }
    })
  })

  afterAll(async () => {
    await app.close()
    await cleanup()  // Clean up test database
  })

  it('creates and retrieves user', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/users',
      payload: {
        email: 'integration@example.com',
        name: 'Integration Test'
      }
    })

    expect(createResponse.statusCode).toBe(201)
    const { id } = createResponse.json()

    const getResponse = await app.inject({
      method: 'GET',
      url: `/users/${id}`
    })

    expect(getResponse.statusCode).toBe(200)
    expect(getResponse.json()).toMatchObject({
      id,
      email: 'integration@example.com'
    })
  })
})
```

### Load Testing Pattern

```javascript
// load-test.js
const autocannon = require('autocannon')
const buildApp = require('./app')

async function runLoadTest() {
  const app = await buildApp()

  await app.listen({ port: 3000, host: '127.0.0.1' })

  const result = await autocannon({
    url: 'http://127.0.0.1:3000/users',
    connections: 100,
    duration: 10,
    pipelining: 10
  })

  console.log(autocannon.printResult(result))

  await app.close()
}

runLoadTest()
```

## Common Anti-Patterns

### ❌ Anti-Pattern 1: Using Fastify Like Express

```javascript
// BAD - Treating Fastify like Express
fastify.use((req, res, next) => {
  // This is Express middleware style - avoid!
  req.customProperty = 'value'
  next()
})

// GOOD - Use Fastify hooks
fastify.addHook('onRequest', async (request, reply) => {
  request.customProperty = 'value'
})

// BETTER - Use decorators
fastify.decorateRequest('customProperty', 'value')
```

### ❌ Anti-Pattern 2: Ignoring Schemas

```javascript
// BAD - No validation or serialization
fastify.post('/users', async (request, reply) => {
  const user = await createUser(request.body)  // No validation!
  return user  // Slow JSON.stringify
})

// GOOD - Schema-first
fastify.post('/users', {
  schema: {
    body: {
      type: 'object',
      required: ['email', 'name'],
      properties: {
        email: { type: 'string', format: 'email' },
        name: { type: 'string' }
      }
    },
    response: {
      201: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string' },
          name: { type: 'string' }
        }
      }
    }
  }
}, async (request, reply) => {
  const user = await createUser(request.body)
  reply.code(201)
  return user  // Fast serialization with fast-json-stringify
})
```

### ❌ Anti-Pattern 3: Synchronous Code in Hot Paths

```javascript
// BAD - Blocking the event loop
fastify.get('/report', async (request, reply) => {
  const data = await fetchData()

  // Synchronous CPU-intensive work blocks event loop!
  const report = generateHugeReport(data)  // Takes 5 seconds

  return report
})

// GOOD - Use worker threads for CPU-intensive work
const { Worker } = require('worker_threads')

fastify.get('/report', async (request, reply) => {
  const data = await fetchData()

  const report = await new Promise((resolve, reject) => {
    const worker = new Worker('./report-worker.js')
    worker.postMessage(data)
    worker.on('message', resolve)
    worker.on('error', reject)
  })

  return report
})
```

### ❌ Anti-Pattern 4: No Testing Strategy

```javascript
// BAD - No tests, manual testing only
// "It works on my machine"

// GOOD - Comprehensive test coverage
describe('User API', () => {
  // Unit tests
  describe('UserService', () => {
    it('validates email format', () => {})
    it('checks for duplicate emails', () => {})
  })

  // Integration tests
  describe('POST /users', () => {
    it('creates user with valid data', () => {})
    it('returns 400 for invalid data', () => {})
  })

  // Load tests
  describe('Performance', () => {
    it('handles 10k req/sec', () => {})
  })
})
```

### ❌ Anti-Pattern 5: "It Works on My Machine" Deployments

```javascript
// BAD - No environment configuration
const fastify = require('fastify')()

fastify.listen(3000)  // Hardcoded port

fastify.register(require('./db'), {
  host: 'localhost',  // Hardcoded database
  password: 'dev123'  // Password in code!
})

// GOOD - Environment-based configuration
const config = {
  port: process.env.PORT || 3000,
  host: process.env.HOST || '0.0.0.0',
  database: {
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  }
}

const fastify = require('fastify')({
  logger: process.env.NODE_ENV === 'production'
})

fastify.listen({
  port: config.port,
  host: config.host
})
```

### ❌ Anti-Pattern 6: Premature Optimization

```javascript
// BAD - Optimizing before profiling
fastify.get('/users/:id', async (request) => {
  // Added Redis cache without measuring if it's needed
  const cached = await redis.get(`user:${request.params.id}`)
  if (cached) return JSON.parse(cached)

  const user = await db.query('...')  // Query is already fast (5ms)

  await redis.set(`user:${request.params.id}`, JSON.stringify(user), 300)
  return user
})

// GOOD - Profile first, then optimize
// 1. Run autocannon to measure baseline
// 2. Use clinic.js to find actual bottlenecks
// 3. Optimize the real problems
// 4. Measure improvement
```

### ❌ Anti-Pattern 7: Leaking Implementation Details

```javascript
// BAD - Exposing internal errors to users
fastify.setErrorHandler((error, request, reply) => {
  reply.send(error)  // Sends full stack trace and DB errors to client!
})

// GOOD - Sanitize errors
fastify.setErrorHandler((error, request, reply) => {
  request.log.error(error)  // Log full error internally

  const statusCode = error.statusCode || 500

  reply.status(statusCode).send({
    statusCode,
    error: error.name,
    message: process.env.NODE_ENV === 'production'
      ? 'An error occurred'
      : error.message,
    correlationId: request.id
  })
})
```

### ❌ Anti-Pattern 8: Not Using fastify-plugin Correctly

```javascript
// BAD - Using fastify-plugin for feature modules
const fp = require('fastify-plugin')

async function usersModule(fastify) {
  fastify.get('/users', handler)  // Now users route is in parent scope!
}

module.exports = fp(usersModule)  // Wrong! Breaks encapsulation

// GOOD - Regular plugin for features
async function usersModule(fastify) {
  fastify.get('/users', handler)  // Properly scoped to this plugin
}

module.exports = usersModule  // No fastify-plugin

// fastify-plugin is ONLY for infrastructure
const fp = require('fastify-plugin')

async function databasePlugin(fastify) {
  fastify.decorate('db', pool)  // Needs to be available everywhere
}

module.exports = fp(databasePlugin)  // Correct usage
```

### ❌ Anti-Pattern 9: Improper Async Handling

```javascript
// BAD - Mixing callbacks and async/await
fastify.get('/users', async (request, reply) => {
  db.query('SELECT * FROM users', (err, result) => {
    if (err) {
      reply.send(err)  // Don't mix callback style with async!
    } else {
      reply.send(result)
    }
  })
})

// GOOD - Pure async/await
fastify.get('/users', async (request, reply) => {
  const users = await db.query('SELECT * FROM users')
  return users  // Return instead of reply.send
})

// BAD - Not handling promise rejections
fastify.get('/users', (request, reply) => {
  getUsersFromDB()  // Returns promise but not awaited or caught!
    .then(users => reply.send(users))
  // If this fails, unhandled rejection!
})

// GOOD - Proper error handling
fastify.get('/users', async (request, reply) => {
  try {
    const users = await getUsersFromDB()
    return users
  } catch (err) {
    // Explicit error handling or let Fastify catch it
    throw err
  }
})
```

### ❌ Anti-Pattern 10: Not Implementing Health Checks

```javascript
// BAD - No health checks
// Kubernetes kills your pod thinking it's dead
// Load balancer sends traffic to broken instances

// GOOD - Proper health checks
fastify.get('/health/live', async () => {
  return { status: 'ok' }
})

fastify.get('/health/ready', async () => {
  const checks = await Promise.allSettled([
    checkDatabase(),
    checkRedis(),
    checkExternalAPI()
  ])

  const allHealthy = checks.every(c => c.status === 'fulfilled')

  if (!allHealthy) {
    reply.code(503)
  }

  return {
    status: allHealthy ? 'ready' : 'not ready',
    checks: checks.map(c => ({
      healthy: c.status === 'fulfilled',
      reason: c.reason?.message
    }))
  }
})
```

## Best Practices Checklist

### Before Deploying to Production

- [ ] All routes have schema validation and serialization
- [ ] Error handler doesn't leak sensitive information
- [ ] Structured logging with correlation IDs
- [ ] Health checks implemented (liveness and readiness)
- [ ] Rate limiting configured
- [ ] Security headers (Helmet) enabled
- [ ] Authentication and authorization implemented
- [ ] CORS properly configured
- [ ] Graceful shutdown implemented
- [ ] Environment-based configuration
- [ ] Tests written (unit, integration, load)
- [ ] Performance profiled with clinic.js
- [ ] Database connection pooling tuned
- [ ] Monitoring and alerting set up
- [ ] Docker/Kubernetes configs ready

### Code Quality

- [ ] Plugins properly scoped (use fastify-plugin only for infrastructure)
- [ ] Shared schemas registered with addSchema
- [ ] Feature-based directory structure
- [ ] Separation of concerns (routes → service → repository)
- [ ] No synchronous code in request handlers
- [ ] Async errors properly handled
- [ ] Worker threads for CPU-intensive tasks
- [ ] Streams for large payloads
- [ ] Circuit breakers for external dependencies

### Security

- [ ] Input validation at every boundary
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (proper escaping)
- [ ] CSRF protection (sameSite cookies, CORS)
- [ ] Secrets in environment variables, not code
- [ ] Secure session handling
- [ ] Rate limiting per route
- [ ] Authentication on protected routes
- [ ] Authorization checks before operations
- [ ] Security updates regularly applied

## When Fastify Fits vs. Doesn't

### ✅ Use Fastify When

- High-throughput APIs where performance matters
- Microservices architectures (lightweight footprint)
- Type-safe APIs with TypeScript
- You value explicit patterns over magic
- Schema-first development aligns with your workflow
- Team willing to learn Fastify-specific patterns

### ❌ Consider Alternatives When

- Team unfamiliar with schema-first approaches and unwilling to learn
- Need extensive middleware ecosystem (Express has more)
- Building simple CRUD apps where framework choice doesn't matter
- Legacy codebase deeply tied to Express patterns
- Rapid prototyping where setup overhead isn't worth it

## Senior-Level Behaviors

### Technical Leadership

- **Code reviews**: Teach patterns, don't just critique
- **Document decisions**: Write ADRs for architectural choices
- **Set standards**: Define performance budgets and monitor them
- **Mentor juniors**: Explain async patterns, Node.js event loop, schema-first benefits

### System Thinking

- Understand where Fastify fits in your architecture
- Database query optimization (N+1 queries, proper indexing)
- Caching strategy: what to cache, where, for how long
- Deployment considerations: blue-green, canary, rollbacks
- Observability: what to log, what to measure, how to alert

### Pragmatism

- Know when "good enough" beats "perfect"
- Manage technical debt: when to take it, when to pay it down
- Build vs. buy decisions for supporting infrastructure
- Recognize framework limitations and when to work around them
- Balance performance with maintainability
