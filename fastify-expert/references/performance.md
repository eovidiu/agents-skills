# Fastify Performance Engineering

## Benchmarking Methodology

### Using Autocannon

Autocannon is the recommended tool for HTTP benchmarking with Node.js applications.

```bash
# Basic benchmark
autocannon -c 100 -d 10 http://localhost:3000

# Options:
# -c: connections (concurrent)
# -d: duration (seconds)
# -p: pipelining factor
# -w: workers (for multi-core)

# Realistic load test
autocannon \
  -c 100 \          # 100 concurrent connections
  -d 30 \           # 30 seconds
  -p 10 \           # 10 pipelined requests
  -w 4 \            # 4 workers
  http://localhost:3000/api/users

# With POST data
autocannon \
  -m POST \
  -H "Content-Type: application/json" \
  -b '{"email":"test@example.com"}' \
  -c 100 -d 10 \
  http://localhost:3000/api/users

# Save results for comparison
autocannon -c 100 -d 10 http://localhost:3000 > before.txt
# Make optimizations
autocannon -c 100 -d 10 http://localhost:3000 > after.txt
```

### Key Metrics to Track

```
Stat         Avg      Stdev    Max
Latency (ms) 10.5     5.2      150     ← Response time
Req/Sec      9500     1200     12000   ← Throughput
Bytes/Sec    2.1 MB   250 kB   3 MB    ← Bandwidth

200k requests in 20s, 42 MB read
```

**What to optimize for**:
- **Latency p50, p95, p99**: User experience (target: <100ms for p99)
- **Throughput (req/sec)**: How much load the server can handle
- **Error rate**: Should be 0% under normal load

### Comparative Benchmarking

```javascript
// baseline.js - No optimization
fastify.get('/users/:id', async (request, reply) => {
  const user = await db.query('SELECT * FROM users WHERE id = $1', [request.params.id])
  return user
})

// optimized.js - With caching
fastify.get('/users/:id', async (request, reply) => {
  const cached = await fastify.cache.get(`user:${request.params.id}`)
  if (cached) return JSON.parse(cached)

  const user = await db.query('SELECT * FROM users WHERE id = $1', [request.params.id])
  await fastify.cache.set(`user:${request.params.id}`, JSON.stringify(user), 300)

  return user
})
```

Run benchmarks on both and compare results.

## Profiling with Clinic.js

Clinic.js suite includes tools for finding performance bottlenecks.

### Clinic Doctor - General Health Check

```bash
# Install globally
npm install -g clinic

# Profile your application
clinic doctor -- node app.js

# Generate load while profiling
autocannon -c 100 -d 30 http://localhost:3000

# Stop server (Ctrl+C)
# Opens HTML report automatically
```

**Doctor identifies**:
- Event loop delays
- CPU bottlenecks
- I/O issues
- Memory problems

### Clinic Flame - CPU Profiling

```bash
clinic flame -- node app.js

# Run load test
autocannon -c 100 -d 30 http://localhost:3000

# Stop and view flamegraph
```

**Flamegraph shows**:
- Which functions consume most CPU
- Call stack depth
- Hot code paths

**What to look for**:
- Wide bars = CPU-intensive functions
- Deep stacks = excessive function calls
- JSON.parse/stringify taking significant time = schema serialization opportunity

### Clinic Bubbleprof - Async Operations

```bash
clinic bubbleprof -- node app.js

# Run realistic load
autocannon -c 100 -d 30 http://localhost:3000
```

**Bubbleprof reveals**:
- Async operation delays
- Database query bottlenecks
- I/O wait times

### Node.js Built-in Profiler

```bash
# Generate CPU profile
node --prof app.js

# Generate load
autocannon -c 100 -d 30 http://localhost:3000

# Stop server, process the profile
node --prof-process isolate-0x*.log > processed.txt

# Analyze processed.txt for hot functions
```

## Finding Bottlenecks

### 1. Event Loop Monitoring

```javascript
// Monitor event loop lag
const fastify = require('fastify')({
  logger: true
})

fastify.addHook('onRequest', async (request) => {
  request.startTime = process.hrtime.bigint()
})

fastify.addHook('onResponse', async (request, reply) => {
  const elapsed = process.hrtime.bigint() - request.startTime
  const ms = Number(elapsed) / 1000000

  if (ms > 100) {
    fastify.log.warn({
      url: request.url,
      duration: ms,
      msg: 'Slow request detected'
    })
  }
})

// Or use event-loop-stats
const loopStats = require('event-loop-stats')

setInterval(() => {
  const stats = loopStats.sense()
  if (stats.max > 50) {
    console.warn('Event loop lag detected:', stats)
  }
}, 5000)
```

### 2. Database Query Analysis

```javascript
// Slow query logging
const { Pool } = require('pg')

const pool = new Pool({
  // ... config
})

const originalQuery = pool.query.bind(pool)

pool.query = async function(...args) {
  const start = Date.now()
  try {
    const result = await originalQuery(...args)
    const duration = Date.now() - start

    if (duration > 100) {
      console.warn('Slow query detected:', {
        query: args[0],
        duration,
        params: args[1]
      })
    }

    return result
  } catch (err) {
    throw err
  }
}

fastify.decorate('db', pool)
```

### 3. Memory Leak Detection

```bash
# Use Node.js built-in heap profiler
node --inspect app.js

# Open Chrome DevTools: chrome://inspect
# Take heap snapshots before/during/after load test
# Compare snapshots to find leaks
```

```javascript
// Programmatic heap snapshot
const v8 = require('v8')
const fs = require('fs')

fastify.get('/heap-snapshot', async () => {
  const filename = `heap-${Date.now()}.heapsnapshot`
  const stream = v8.writeHeapSnapshot(filename)
  return { snapshot: filename }
})
```

## Stream Handling

Fastify handles streams natively - use this for large payloads to avoid memory bloat.

### Streaming File Uploads

```javascript
const fs = require('fs')
const util = require('util')
const { pipeline } = require('stream')
const pump = util.promisify(pipeline)

fastify.post('/upload', async (request, reply) => {
  const data = await request.file()

  // Stream directly to disk (memory-efficient)
  await pump(data.file, fs.createWriteStream(`./uploads/${data.filename}`))

  return { uploaded: data.filename }
})
```

### Streaming Responses

```javascript
const fs = require('fs')

fastify.get('/download/:file', async (request, reply) => {
  const stream = fs.createReadStream(`./files/${request.params.file}`)

  reply.type('application/octet-stream')
  return reply.send(stream)
})

// Streaming JSON responses
const { Readable } = require('stream')

fastify.get('/users/stream', async (request, reply) => {
  reply.type('application/json')

  const stream = new Readable({
    async read() {
      // Fetch data in chunks
      const users = await db.query('SELECT * FROM users LIMIT 100 OFFSET ' + this.offset)
      this.offset = (this.offset || 0) + 100

      if (users.length === 0) {
        this.push(null) // End stream
      } else {
        this.push(JSON.stringify(users))
      }
    }
  })

  return reply.send(stream)
})
```

### Backpressure Handling

```javascript
const { Transform } = require('stream')

// Transform stream with backpressure handling
const processStream = new Transform({
  objectMode: true,
  async transform(chunk, encoding, callback) {
    try {
      // Process chunk
      const processed = await heavyProcessing(chunk)
      callback(null, processed)
    } catch (err) {
      callback(err)
    }
  }
})

fastify.post('/process-stream', async (request, reply) => {
  const data = await request.file()

  reply.type('application/json')

  return reply.send(
    data.file
      .pipe(processStream)
      .pipe(transformToJSON)
  )
})
```

## Worker Threads for CPU-Intensive Tasks

Keep the event loop free by offloading CPU-heavy work to worker threads.

### Worker Thread Pattern

```javascript
// worker.js
const { parentPort } = require('worker_threads')

parentPort.on('message', (data) => {
  // CPU-intensive work
  const result = expensiveComputation(data)
  parentPort.postMessage(result)
})

function expensiveComputation(data) {
  // Heavy processing (e.g., image manipulation, cryptography)
  let sum = 0
  for (let i = 0; i < 1e9; i++) {
    sum += Math.sqrt(i)
  }
  return sum
}

// app.js
const { Worker } = require('worker_threads')
const path = require('path')

// Worker pool
class WorkerPool {
  constructor(workerPath, poolSize = 4) {
    this.workerPath = workerPath
    this.workers = []
    this.queue = []

    for (let i = 0; i < poolSize; i++) {
      this.workers.push({ worker: this.createWorker(), busy: false })
    }
  }

  createWorker() {
    return new Worker(this.workerPath)
  }

  async exec(data) {
    return new Promise((resolve, reject) => {
      const availableWorker = this.workers.find(w => !w.busy)

      if (availableWorker) {
        this.runTask(availableWorker, data, resolve, reject)
      } else {
        this.queue.push({ data, resolve, reject })
      }
    })
  }

  runTask(workerObj, data, resolve, reject) {
    workerObj.busy = true

    const onMessage = (result) => {
      workerObj.worker.removeListener('message', onMessage)
      workerObj.worker.removeListener('error', onError)
      workerObj.busy = false

      resolve(result)

      // Process queue
      if (this.queue.length > 0) {
        const { data, resolve, reject } = this.queue.shift()
        this.runTask(workerObj, data, resolve, reject)
      }
    }

    const onError = (err) => {
      workerObj.worker.removeListener('message', onMessage)
      workerObj.worker.removeListener('error', onError)
      workerObj.busy = false

      reject(err)
    }

    workerObj.worker.once('message', onMessage)
    workerObj.worker.once('error', onError)
    workerObj.worker.postMessage(data)
  }
}

// Use in Fastify
const pool = new WorkerPool(path.join(__dirname, 'worker.js'), 4)

fastify.post('/compute', async (request, reply) => {
  const result = await pool.exec(request.body)
  return { result }
})
```

### When to Use Worker Threads

**Use for**:
- Image/video processing
- Cryptographic operations (hashing, encryption)
- Data compression
- Heavy mathematical computations
- Report generation

**Don't use for**:
- I/O operations (use async/await)
- Database queries
- HTTP requests
- Simple JSON transformations

## Database Connection Pooling

Tune pool size to your load patterns.

### PostgreSQL Pool Tuning

```javascript
const { Pool } = require('pg')

const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  // Pool configuration
  min: 2,                    // Minimum connections
  max: 10,                   // Maximum connections
  idleTimeoutMillis: 30000,  // Close idle connections after 30s
  connectionTimeoutMillis: 2000, // Fail fast if no connection available

  // Statement timeout (prevent long-running queries)
  statement_timeout: 5000,

  // Application name for monitoring
  application_name: 'fastify-api'
})

// Monitor pool health
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err)
  process.exit(-1)
})

pool.on('connect', (client) => {
  console.log('New client connected to pool')
})

pool.on('remove', (client) => {
  console.log('Client removed from pool')
})
```

### Calculating Optimal Pool Size

Formula: `connections = ((core_count * 2) + effective_spindle_count)`

For a 4-core server with SSD:
- `connections = (4 * 2) + 1 = 9`

**In practice**:
- Start with 10 connections
- Monitor with `pg_stat_activity`
- Increase if you see connection waits
- Decrease if database is overwhelmed

### Connection Pool Monitoring

```javascript
fastify.get('/pool-stats', async () => {
  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount
  }
})

// Alert if pool is saturated
setInterval(() => {
  if (pool.waitingCount > 0) {
    console.warn('Connection pool saturation detected:', {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount
    })
  }
}, 10000)
```

## Schema Compilation Optimization

Fastify compiles JSON schemas once at startup for maximum performance.

### Schema Reuse

```javascript
// BAD - Schema compiled every request
fastify.get('/user/:id', {
  schema: {
    params: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' }
      }
    }
  }
}, handler)

// GOOD - Schema compiled once
const userIdSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' }
  }
}

fastify.get('/user/:id', {
  schema: {
    params: userIdSchema
  }
}, handler)

// BETTER - Shared schema with $ref
fastify.addSchema({
  $id: 'userId',
  type: 'string',
  format: 'uuid'
})

fastify.get('/user/:id', {
  schema: {
    params: {
      type: 'object',
      properties: {
        id: { $ref: 'userId#' }
      }
    }
  }
}, handler)
```

### Serialization Performance

```javascript
// Response schema for serialization
fastify.get('/users', {
  schema: {
    response: {
      200: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' }
          }
        }
      }
    }
  }
}, async () => {
  const users = await db.query('SELECT * FROM users')
  return users
  // Fastify uses fast-json-stringify for 2-3x faster serialization
})
```

**Performance gains**:
- `JSON.stringify()`: ~100k ops/sec
- `fast-json-stringify` (with schema): ~300k ops/sec

## Caching Strategies

### In-Memory Cache

```javascript
const fastify = require('fastify')()
const NodeCache = require('node-cache')

const cache = new NodeCache({
  stdTTL: 600,           // 10 minutes default TTL
  checkperiod: 120,      // Check for expired keys every 2 minutes
  useClones: false       // Don't clone objects (faster, but be careful with mutations)
})

fastify.decorate('cache', cache)

fastify.get('/users/:id', async (request, reply) => {
  const cacheKey = `user:${request.params.id}`

  // Check cache first
  const cached = fastify.cache.get(cacheKey)
  if (cached) {
    return cached
  }

  // Fetch from database
  const user = await fastify.db.query('SELECT * FROM users WHERE id = $1', [request.params.id])

  // Store in cache
  fastify.cache.set(cacheKey, user, 600)

  return user
})
```

### Redis Cache

```javascript
const Redis = require('ioredis')

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: 6379,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true
})

fastify.decorate('redis', redis)

fastify.get('/popular-posts', async (request, reply) => {
  const cacheKey = 'popular:posts'

  // Try cache
  const cached = await fastify.redis.get(cacheKey)
  if (cached) {
    return JSON.parse(cached)
  }

  // Expensive query
  const posts = await fastify.db.query(`
    SELECT * FROM posts
    ORDER BY views DESC
    LIMIT 10
  `)

  // Cache for 1 hour
  await fastify.redis.setex(cacheKey, 3600, JSON.stringify(posts))

  return posts
})
```

### HTTP Caching Headers

```javascript
fastify.get('/static-data', async (request, reply) => {
  const data = await fetchData()

  // Cache in browser and CDN for 1 hour
  reply.header('Cache-Control', 'public, max-age=3600')
  reply.header('ETag', generateETag(data))

  return data
})

// Conditional requests
fastify.get('/users/:id', async (request, reply) => {
  const user = await getUser(request.params.id)
  const etag = `"${user.updated_at}"`

  if (request.headers['if-none-match'] === etag) {
    return reply.code(304).send()
  }

  reply.header('ETag', etag)
  reply.header('Cache-Control', 'private, max-age=300')

  return user
})
```
