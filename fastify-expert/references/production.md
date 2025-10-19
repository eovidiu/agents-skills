# Production Readiness

## Observability

### Structured Logging with Pino

Fastify uses Pino by default - the fastest Node.js logger.

```javascript
const fastify = require('fastify')({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    serializers: {
      req(request) {
        return {
          method: request.method,
          url: request.url,
          headers: request.headers,
          hostname: request.hostname,
          remoteAddress: request.ip,
          remotePort: request.socket.remotePort
        }
      },
      res(reply) {
        return {
          statusCode: reply.statusCode
        }
      }
    }
  }
})

// Custom log levels
fastify.log.info('Server starting')
fastify.log.warn({ msg: 'Deprecated endpoint called', endpoint: '/old-api' })
fastify.log.error({ err: error }, 'Request failed')
```

### Correlation IDs

Track requests across services.

```javascript
const { v4: uuidv4 } = require('uuid')

fastify.addHook('onRequest', async (request, reply) => {
  // Use existing correlation ID or generate new one
  request.id = request.headers['x-correlation-id'] || uuidv4()

  // Add to response headers
  reply.header('x-correlation-id', request.id)

  // Make available in logs
  request.log = request.log.child({ correlationId: request.id })
})

// In handlers
fastify.get('/users/:id', async (request, reply) => {
  request.log.info({ userId: request.params.id }, 'Fetching user')

  try {
    const user = await getUser(request.params.id)
    return user
  } catch (err) {
    request.log.error({ err, userId: request.params.id }, 'Failed to fetch user')
    throw err
  }
})
```

### Request Duration Logging

```javascript
fastify.addHook('onRequest', async (request) => {
  request.startTime = Date.now()
})

fastify.addHook('onResponse', async (request, reply) => {
  const duration = Date.now() - request.startTime

  request.log.info({
    method: request.method,
    url: request.url,
    statusCode: reply.statusCode,
    duration,
    correlationId: request.id
  }, 'Request completed')

  // Alert on slow requests
  if (duration > 1000) {
    request.log.warn({
      msg: 'Slow request detected',
      duration,
      url: request.url
    })
  }
})
```

### Error Tracking

```javascript
// Integration with Sentry, Rollbar, etc.
const Sentry = require('@sentry/node')

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1  // Sample 10% of transactions
})

fastify.addHook('onError', async (request, reply, error) => {
  // Don't send validation errors to Sentry
  if (error.validation) return

  Sentry.captureException(error, {
    tags: {
      url: request.url,
      method: request.method,
      statusCode: reply.statusCode
    },
    user: {
      id: request.user?.id
    },
    extra: {
      correlationId: request.id,
      params: request.params,
      query: request.query
    }
  })
})
```

### Metrics Collection

```javascript
const client = require('prom-client')

// Create metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000]
})

const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
})

const activeConnections = new client.Gauge({
  name: 'active_connections',
  help: 'Number of active connections'
})

// Collect metrics
fastify.addHook('onRequest', async (request) => {
  request.startTime = Date.now()
  activeConnections.inc()
})

fastify.addHook('onResponse', async (request, reply) => {
  const duration = Date.now() - request.startTime
  const route = request.routeOptions?.url || request.url

  httpRequestDuration
    .labels(request.method, route, reply.statusCode)
    .observe(duration)

  httpRequestTotal
    .labels(request.method, route, reply.statusCode)
    .inc()

  activeConnections.dec()
})

// Expose metrics endpoint
fastify.get('/metrics', async (request, reply) => {
  reply.type('text/plain')
  return client.register.metrics()
})
```

### Health Checks and Readiness Probes

```javascript
// Liveness probe - is the app running?
fastify.get('/health/live', async () => {
  return { status: 'ok' }
})

// Readiness probe - can it handle requests?
fastify.get('/health/ready', async (request, reply) => {
  const checks = {
    database: false,
    redis: false
  }

  try {
    // Check database
    await fastify.db.query('SELECT 1')
    checks.database = true
  } catch (err) {
    request.log.error({ err }, 'Database health check failed')
  }

  try {
    // Check Redis
    await fastify.redis.ping()
    checks.redis = true
  } catch (err) {
    request.log.error({ err }, 'Redis health check failed')
  }

  const isReady = Object.values(checks).every(Boolean)

  if (!isReady) {
    reply.code(503)
  }

  return {
    status: isReady ? 'ready' : 'not ready',
    checks
  }
})
```

### APM Integration

```javascript
// New Relic
require('newrelic')
const fastify = require('fastify')()

// DataDog
const tracer = require('dd-trace').init()
const fastify = require('fastify')()

// Elastic APM
const apm = require('elastic-apm-node').start({
  serviceName: 'my-fastify-app',
  serverUrl: process.env.ELASTIC_APM_SERVER_URL,
  environment: process.env.NODE_ENV
})

const fastify = require('fastify')()
```

## Security

### Helmet for Security Headers

```javascript
await fastify.register(require('@fastify/helmet'), {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:']
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
})
```

### Rate Limiting

```javascript
await fastify.register(require('@fastify/rate-limit'), {
  max: 100,                    // Max requests per timeWindow
  timeWindow: '1 minute',      // Time window
  cache: 10000,                // Cache size
  allowList: ['127.0.0.1'],    // Whitelist IPs
  redis: fastify.redis,        // Use Redis for distributed rate limiting
  skipOnError: true,           // Don't fail open on Redis errors

  // Custom key generator
  keyGenerator: (request) => {
    return request.user?.id || request.ip
  },

  // Custom error response
  errorResponseBuilder: (request, context) => {
    return {
      statusCode: 429,
      error: 'Too Many Requests',
      message: `Rate limit exceeded, retry in ${context.after}`,
      retryAfter: context.after
    }
  }
})

// Route-specific rate limits
fastify.post('/login', {
  config: {
    rateLimit: {
      max: 5,
      timeWindow: '1 minute'
    }
  }
}, loginHandler)
```

### Authentication: JWT Pattern

```javascript
await fastify.register(require('@fastify/jwt'), {
  secret: process.env.JWT_SECRET,
  sign: {
    expiresIn: '1h'
  }
})

// Login endpoint
fastify.post('/login', async (request, reply) => {
  const { email, password } = request.body

  const user = await validateCredentials(email, password)
  if (!user) {
    return reply.code(401).send({ error: 'Invalid credentials' })
  }

  const token = fastify.jwt.sign({
    id: user.id,
    email: user.email,
    roles: user.roles
  })

  return { token }
})

// Authentication decorator
fastify.decorate('authenticate', async (request, reply) => {
  try {
    await request.jwtVerify()
  } catch (err) {
    reply.code(401).send({ error: 'Unauthorized' })
  }
})

// Protected route
fastify.get('/profile', {
  onRequest: [fastify.authenticate]
}, async (request) => {
  // request.user is set by jwtVerify
  return { user: request.user }
})

// Role-based access control
fastify.decorate('authorize', (...roles) => {
  return async (request, reply) => {
    await request.jwtVerify()

    if (!roles.includes(request.user.role)) {
      return reply.code(403).send({ error: 'Forbidden' })
    }
  }
})

fastify.delete('/users/:id', {
  onRequest: [fastify.authorize('admin')]
}, deleteUserHandler)
```

### OAuth2 Integration

```javascript
await fastify.register(require('@fastify/oauth2'), {
  name: 'googleOAuth2',
  credentials: {
    client: {
      id: process.env.GOOGLE_CLIENT_ID,
      secret: process.env.GOOGLE_CLIENT_SECRET
    },
    auth: googleOAuth2.GOOGLE_CONFIGURATION
  },
  startRedirectPath: '/login/google',
  callbackUri: 'http://localhost:3000/login/google/callback'
})

fastify.get('/login/google/callback', async (request, reply) => {
  const { token } = await fastify.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request)

  // Fetch user info
  const userInfo = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${token.access_token}` }
  }).then(r => r.json())

  // Create session or JWT
  const jwt = fastify.jwt.sign({ id: userInfo.id, email: userInfo.email })

  reply.setCookie('token', jwt, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 3600
  })

  return reply.redirect('/dashboard')
})
```

### Input Validation at Every Boundary

```javascript
// Schema validation is the first line of defense
fastify.post('/users', {
  schema: {
    body: {
      type: 'object',
      required: ['email', 'name'],
      properties: {
        email: { type: 'string', format: 'email', maxLength: 255 },
        name: { type: 'string', minLength: 1, maxLength: 100 }
      },
      additionalProperties: false  // Reject extra fields
    }
  }
}, async (request, reply) => {
  // request.body is validated and safe

  // Additional business logic validation
  const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [request.body.email])
  if (existingUser) {
    return reply.code(409).send({ error: 'Email already exists' })
  }

  const user = await createUser(request.body)
  return reply.code(201).send(user)
})
```

### CORS Configuration

```javascript
await fastify.register(require('@fastify/cors'), {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'https://app.example.com',
      'https://admin.example.com'
    ]

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,              // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Total-Count'],
  maxAge: 86400                   // Cache preflight for 24h
})

// Or simple configuration for development
await fastify.register(require('@fastify/cors'), {
  origin: process.env.NODE_ENV === 'production'
    ? 'https://app.example.com'
    : true  // Allow all origins in dev
})
```

### Secure Session Handling

```javascript
await fastify.register(require('@fastify/secure-session'), {
  secret: process.env.SESSION_SECRET,
  salt: process.env.SESSION_SALT,
  cookie: {
    path: '/',
    httpOnly: true,      // Not accessible via JavaScript
    secure: true,        // HTTPS only
    sameSite: 'strict',  // CSRF protection
    maxAge: 24 * 60 * 60 // 24 hours
  }
})

fastify.post('/login', async (request, reply) => {
  const user = await validateCredentials(request.body)

  request.session.set('user', {
    id: user.id,
    email: user.email
  })

  return { success: true }
})

fastify.get('/profile', async (request, reply) => {
  const user = request.session.get('user')

  if (!user) {
    return reply.code(401).send({ error: 'Not authenticated' })
  }

  return { user }
})
```

## Error Handling

### Custom Error Handler

```javascript
fastify.setErrorHandler((error, request, reply) => {
  // Log all errors
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
      details: error.validation
    })
  }

  // Not found errors
  if (error.statusCode === 404) {
    return reply.status(404).send({
      statusCode: 404,
      error: 'Not Found',
      message: 'Resource not found'
    })
  }

  // Custom application errors
  if (error.code === 'USER_NOT_FOUND') {
    return reply.status(404).send({
      statusCode: 404,
      error: 'Not Found',
      message: 'User not found'
    })
  }

  // Internal server errors - don't leak details in production
  const statusCode = error.statusCode || 500

  reply.status(statusCode).send({
    statusCode,
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production'
      ? 'An error occurred'
      : error.message,
    correlationId: request.id
  })
})
```

### Custom Error Classes

```javascript
class AppError extends Error {
  constructor(message, statusCode = 500, code) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    Error.captureStackTrace(this, this.constructor)
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND')
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED')
  }
}

class ValidationError extends AppError {
  constructor(message = 'Validation failed', details) {
    super(message, 400, 'VALIDATION_ERROR')
    this.details = details
  }
}

// Usage
fastify.get('/users/:id', async (request) => {
  const user = await getUser(request.params.id)

  if (!user) {
    throw new NotFoundError('User')
  }

  return user
})
```

### Async Error Handling

```javascript
// Fastify automatically catches async errors
fastify.get('/users', async () => {
  // If this throws, Fastify catches it and sends to error handler
  const users = await db.query('SELECT * FROM users')
  return users
})

// For non-async routes, use try/catch or throw
fastify.get('/sync-route', (request, reply) => {
  try {
    const result = syncOperation()
    reply.send(result)
  } catch (err) {
    reply.send(err)  // Forwards to error handler
  }
})
```

### Circuit Breakers for External Dependencies

```javascript
const CircuitBreaker = require('opossum')

// Create circuit breaker for external API
const options = {
  timeout: 3000,        // If request takes longer than 3s, fail
  errorThresholdPercentage: 50,  // Open circuit if 50% of requests fail
  resetTimeout: 30000   // Try again after 30s
}

const breaker = new CircuitBreaker(async (userId) => {
  const response = await fetch(`https://api.example.com/users/${userId}`)
  if (!response.ok) throw new Error('API error')
  return response.json()
}, options)

breaker.fallback(() => {
  // Return cached data or default response
  return { cached: true }
})

breaker.on('open', () => {
  fastify.log.warn('Circuit breaker opened for external API')
})

breaker.on('halfOpen', () => {
  fastify.log.info('Circuit breaker half-open, testing API')
})

fastify.get('/users/:id', async (request) => {
  try {
    const user = await breaker.fire(request.params.id)
    return user
  } catch (err) {
    // Circuit is open or request failed
    throw new Error('Service temporarily unavailable')
  }
})
```

### Graceful Degradation

```javascript
fastify.get('/recommendations', async (request, reply) => {
  let recommendations = []

  try {
    // Try to fetch personalized recommendations
    recommendations = await fetchRecommendations(request.user.id)
  } catch (err) {
    request.log.warn({ err }, 'Failed to fetch personalized recommendations, using defaults')

    // Fallback to default recommendations
    recommendations = await fetchDefaultRecommendations()
  }

  return { recommendations }
})
```

## Deployment

### Production Environment Variables

```bash
# .env.production
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Logging
LOG_LEVEL=info

# Database
DB_HOST=postgres.example.com
DB_NAME=myapp
DB_USER=appuser
DB_PASSWORD=securepassword
DB_POOL_MIN=2
DB_POOL_MAX=10

# Redis
REDIS_HOST=redis.example.com
REDIS_PORT=6379

# Security
JWT_SECRET=super-secret-key
SESSION_SECRET=another-secret
SESSION_SALT=random-salt

# External APIs
API_KEY=your-api-key

# APM
SENTRY_DSN=https://...
NEW_RELIC_LICENSE_KEY=...
```

### Graceful Shutdown

```javascript
// app.js
const closeListeners = []

async function closeGracefully(signal) {
  console.log(`Received signal ${signal}, closing gracefully`)

  // Stop accepting new connections
  await fastify.close()

  // Close database connections, etc.
  for (const listener of closeListeners) {
    await listener()
  }

  process.exit(0)
}

process.on('SIGINT', closeGracefully)
process.on('SIGTERM', closeGracefully)

// Register cleanup functions
closeListeners.push(async () => {
  await fastify.db.end()
  console.log('Database connections closed')
})

closeListeners.push(async () => {
  await fastify.redis.quit()
  console.log('Redis connections closed')
})
```

### Docker Configuration

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Production image
FROM node:18-alpine

WORKDIR /app

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3000

CMD ["node", "app.js"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      DB_HOST: postgres
      REDIS_HOST: redis
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: appuser
      POSTGRES_PASSWORD: securepassword
    volumes:
      - postgres-data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data

volumes:
  postgres-data:
  redis-data:
```

### Kubernetes Deployment

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fastify-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: fastify-app
  template:
    metadata:
      labels:
        app: fastify-app
    spec:
      containers:
      - name: app
        image: your-registry/fastify-app:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DB_HOST
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: host
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 10
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

### PM2 Process Manager

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'fastify-app',
    script: './app.js',
    instances: 'max',      // Use all CPU cores
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    max_memory_restart: '500M',
    autorestart: true,
    watch: false
  }]
}
```

```bash
# Start with PM2
pm2 start ecosystem.config.js --env production

# Monitor
pm2 monit

# View logs
pm2 logs

# Reload (zero-downtime)
pm2 reload fastify-app
```
