---
name: fastify-expert
description: Expert-level Fastify framework skill for building high-performance Node.js applications. Use when building REST APIs, microservices, or web servers with Fastify. Provides senior-level knowledge of plugin architecture, schema-first development, performance optimization, production deployment, security, and observability. Covers benchmarking with autocannon, profiling with clinic.js, and production-ready patterns.
---

# Fastify Expert

## Overview

Fastify Expert provides comprehensive, senior-level guidance for building production-ready, high-performance applications using the Fastify web framework. This skill emphasizes schema-first development, plugin architecture mastery, performance engineering, and production best practices that distinguish senior developers from mid-level practitioners.

Use this skill when building or optimizing Fastify applications, implementing microservices, setting up production deployments, or requiring deep architectural guidance for Node.js web services.

## Core Capabilities

### 1. Architecture and Plugin System

Master Fastify's plugin system for building scalable, maintainable applications:

- **Plugin Encapsulation**: Understand scope isolation and when to use `fastify-plugin` vs. regular plugins
- **Decorator Pattern**: Extend Fastify instances with custom properties and methods
- **Route Prefixing**: Implement hierarchical API structures
- **Content Type Parsers**: Handle XML, binary, and custom content types
- **Lifecycle Hooks**: Leverage the full request/response lifecycle for authentication, logging, and metrics

**Reference**: `references/architecture.md` contains comprehensive plugin patterns, encapsulation strategies, hook execution order, and testing patterns.

**Example - Feature Plugin Pattern**:
```javascript
// features/users/index.js
async function usersPlugin(fastify, options) {
  // Register schemas
  fastify.addSchema({
    $id: 'user',
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      email: { type: 'string', format: 'email' },
      name: { type: 'string' }
    }
  })

  // Register routes
  await fastify.register(require('./routes'), { prefix: '/users' })

  // Decorate with service
  fastify.decorate('userService', require('./service')(fastify))
}

module.exports = usersPlugin
```

### 2. Schema-First Development

Implement type-safe, high-performance APIs using JSON Schema, fluent-schema, or TypeBox:

- **Validation**: Automatic request validation for params, query, body, and headers
- **Serialization**: 2-3x faster JSON serialization using `fast-json-stringify`
- **Documentation**: Auto-generate OpenAPI/Swagger documentation
- **Type Safety**: Integrate with TypeScript using TypeBox for full type inference

**Reference**: `references/schemas.md` provides complete coverage of JSON Schema, fluent-schema, TypeBox patterns, schema organization, and performance best practices.

**Example - TypeBox with TypeScript**:
```typescript
import { Type, Static } from '@sinclair/typebox'

const UserSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  email: Type.String({ format: 'email' }),
  name: Type.String()
})

type User = Static<typeof UserSchema>

fastify.get<{ Reply: User }>('/user/:id', {
  schema: {
    response: {
      200: UserSchema
    }
  }
}, async (request, reply) => {
  const user: User = await getUser(request.params.id)
  return user  // Fully typed and fast serialization!
})
```

### 3. Performance Engineering

Optimize Fastify applications for maximum throughput and minimal latency:

- **Benchmarking**: Use autocannon for realistic load testing
- **Profiling**: Leverage clinic.js (doctor, flame, bubbleprof) to find bottlenecks
- **Stream Handling**: Process large payloads efficiently without memory bloat
- **Worker Threads**: Offload CPU-intensive tasks to keep the event loop responsive
- **Database Connection Pooling**: Tune pool size for optimal performance
- **Caching Strategies**: Implement in-memory, Redis, and HTTP caching

**Reference**: `references/performance.md` covers benchmarking methodology, profiling tools, optimization techniques, and caching patterns.

**Scripts**:
- `scripts/benchmark.sh` - Autocannon benchmarking script
- `scripts/profile.sh` - Clinic.js profiling wrapper (doctor, flame, bubbleprof, heap)

**Example - Benchmarking**:
```bash
# Run comprehensive benchmark
./scripts/benchmark.sh /api/users

# Profile with clinic doctor
./scripts/profile.sh doctor src/server.js

# Generate load while profiling
autocannon -c 100 -d 30 http://localhost:3000
```

### 4. Production Deployment

Deploy Fastify applications with enterprise-grade reliability:

- **Observability**: Structured logging with Pino, correlation IDs, metrics collection
- **Health Checks**: Liveness and readiness probes for Kubernetes
- **Security**: Helmet, CORS, rate limiting, JWT/OAuth2 authentication
- **Error Handling**: Custom error classes, circuit breakers, graceful degradation
- **Deployment**: Docker, Kubernetes, PM2 configurations
- **Graceful Shutdown**: Proper cleanup of connections and resources

**Reference**: `references/production.md` provides deployment patterns, security configurations, monitoring strategies, and Docker/Kubernetes setups.

**Example - Health Checks**:
```javascript
// Liveness probe
fastify.get('/health/live', async () => {
  return { status: 'ok' }
})

// Readiness probe
fastify.get('/health/ready', async () => {
  const dbHealthy = await checkDatabase()
  const redisHealthy = await checkRedis()

  if (!dbHealthy || !redisHealthy) {
    reply.code(503)
  }

  return {
    status: dbHealthy && redisHealthy ? 'ready' : 'not ready',
    checks: { database: dbHealthy, redis: redisHealthy }
  }
})
```

### 5. Code Organization and Patterns

Structure applications for maintainability and scalability:

- **Feature-Based Architecture**: Organize by domain features, not technical layers
- **Separation of Concerns**: Routes → Service → Repository pattern
- **Testing Strategies**: Unit, integration, and load testing without server startup
- **Configuration Management**: Environment-based configuration
- **Clean Plugin Architecture**: One plugin per feature, proper encapsulation

**Reference**: `references/patterns.md` covers architectural patterns, testing strategies, common anti-patterns to avoid, and best practices checklist.

**Asset**: `assets/fastify-template/` - Complete production-ready boilerplate with:
- Feature-based directory structure
- Database integration (PostgreSQL)
- Authentication (JWT)
- API documentation (Swagger)
- Docker and docker-compose setup
- Comprehensive testing setup
- Example CRUD implementation

### 6. Senior-Level Expertise

Demonstrate technical leadership and system thinking:

- **Architectural Judgment**: Know when Fastify fits vs. when alternatives are better
- **Performance Budgets**: Set and monitor performance targets
- **Technical Debt Management**: Balance speed with maintainability
- **Code Reviews**: Teach patterns, not just critique
- **Mentoring**: Guide juniors on async patterns and Node.js fundamentals
- **System Design**: Understand where Fastify fits in your architecture
- **Pragmatism**: Know when "good enough" beats "perfect"

**Reference**: `references/patterns.md` includes senior-level behaviors, architectural decision-making, and when to use (or not use) Fastify.

## Quick Start

To build a new high-performance Fastify application:

1. **Use the production-ready template**:
```bash
# Copy the template
cp -r assets/fastify-template/ /path/to/your/project
cd /path/to/your/project

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your configuration

# Start development
npm run dev
```

2. **The template includes**:
- Complete plugin architecture
- Feature-based structure with users example
- Database integration (PostgreSQL)
- JWT authentication
- Request validation and fast serialization
- Structured logging with correlation IDs
- Health checks
- API documentation
- Docker configuration
- Testing setup

3. **Run benchmarks**:
```bash
npm run benchmark
```

4. **Profile performance**:
```bash
# General health check
npm run profile:doctor

# CPU profiling
npm run profile:flame

# Async operations
npm run profile:bubble
```

## When to Use This Skill

Trigger this skill when:
- Building REST APIs or microservices with Fastify
- Optimizing Fastify application performance
- Setting up production deployments
- Implementing authentication and authorization
- Designing plugin architecture
- Creating schema-first APIs
- Profiling and benchmarking Node.js applications
- Requiring senior-level architectural guidance
- Building high-throughput, low-latency services

## Key Principles

**Schema-First Development**: Always define schemas for validation and serialization. This is non-negotiable for Fastify performance.

**Plugin Encapsulation**: Use regular plugins for features, `fastify-plugin` only for infrastructure. Understand scope isolation.

**Async All the Way**: Never block the event loop. Use async/await, worker threads for CPU-intensive tasks, and streams for large payloads.

**Profile Before Optimizing**: Use autocannon and clinic.js to identify real bottlenecks, not perceived ones.

**Production Readiness**: Include logging, metrics, health checks, error handling, and graceful shutdown from day one.

**Test Without Server Startup**: Use `fastify.inject()` for fast, reliable testing.

**Separation of Concerns**: Routes handle HTTP, services contain business logic, repositories manage data access.

## Anti-Patterns to Avoid

❌ Using Fastify like Express (middleware-first thinking)
❌ Ignoring schemas (missing performance gains)
❌ Synchronous code in hot paths (blocking event loop)
❌ No testing strategy
❌ Premature optimization without profiling
❌ Using `fastify-plugin` for feature modules
❌ Leaking implementation details in error messages
❌ "It works on my machine" deployments

See `references/patterns.md` for comprehensive anti-pattern coverage.

## Resources

### references/
Comprehensive documentation loaded into context as needed:

- `architecture.md` - Plugin system, decorators, lifecycle hooks, testing
- `performance.md` - Benchmarking, profiling, optimization, caching
- `schemas.md` - JSON Schema, fluent-schema, TypeBox, organization
- `production.md` - Deployment, security, observability, error handling
- `patterns.md` - Code organization, anti-patterns, best practices

### scripts/
Executable utilities for benchmarking and profiling:

- `benchmark.sh` - Autocannon benchmarking script with configurable parameters
- `profile.sh` - Clinic.js profiling wrapper (doctor/flame/bubbleprof/heap)

### assets/
Production-ready Fastify application template:

- `fastify-template/` - Complete boilerplate with feature-based architecture, database integration, authentication, testing, Docker configuration, and best practices implementation

## Getting Help

For specific topics:

- **Architecture questions**: Refer to `references/architecture.md`
- **Performance issues**: Use `scripts/benchmark.sh` and `scripts/profile.sh`, then consult `references/performance.md`
- **Schema design**: See `references/schemas.md`
- **Production deployment**: Check `references/production.md`
- **Code organization**: Review `references/patterns.md`
- **Starting a new project**: Use `assets/fastify-template/`

This skill represents senior-level Fastify expertise. Apply these patterns consistently to build production-grade, high-performance Node.js applications.
