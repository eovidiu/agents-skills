# Schema-First Development with Fastify

## Why Schemas Matter in Fastify

Schemas provide **three critical benefits**:

1. **Validation**: Automatic request validation (params, query, body, headers)
2. **Serialization**: 2-3x faster JSON serialization using `fast-json-stringify`
3. **Documentation**: Auto-generate OpenAPI/Swagger docs

## JSON Schema Fundamentals

### Basic Structure

```javascript
fastify.post('/users', {
  schema: {
    body: {
      type: 'object',
      required: ['email', 'name'],
      properties: {
        email: {
          type: 'string',
          format: 'email'
        },
        name: {
          type: 'string',
          minLength: 1,
          maxLength: 100
        },
        age: {
          type: 'integer',
          minimum: 0,
          maximum: 150
        }
      },
      additionalProperties: false  // Reject unknown fields
    },
    response: {
      201: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string' },
          name: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' }
        }
      }
    }
  }
}, async (request, reply) => {
  const user = await createUser(request.body)
  reply.code(201)
  return user
})
```

### Common Types and Formats

```javascript
// String types
{
  type: 'string',
  minLength: 1,
  maxLength: 255,
  pattern: '^[a-zA-Z0-9]+$',  // Regex validation
  format: 'email'              // Built-in formats: email, uri, uuid, date-time, ipv4, ipv6
}

// Number types
{
  type: 'number',        // or 'integer'
  minimum: 0,
  maximum: 100,
  exclusiveMinimum: 0,   // > 0 (not >= 0)
  multipleOf: 5          // Must be divisible by 5
}

// Array types
{
  type: 'array',
  items: { type: 'string' },
  minItems: 1,
  maxItems: 10,
  uniqueItems: true      // No duplicates
}

// Object types
{
  type: 'object',
  required: ['field1', 'field2'],
  properties: {
    field1: { type: 'string' },
    field2: { type: 'number' }
  },
  additionalProperties: false  // Strict mode
}

// Enums
{
  type: 'string',
  enum: ['active', 'inactive', 'pending']
}

// Nullable fields
{
  type: ['string', 'null']  // Can be string or null
}

// OneOf (union types)
{
  oneOf: [
    { type: 'string' },
    { type: 'number' }
  ]
}

// AllOf (intersection)
{
  allOf: [
    { type: 'object', properties: { id: { type: 'string' } } },
    { type: 'object', properties: { name: { type: 'string' } } }
  ]
}
```

### Validation Error Handling

```javascript
fastify.setErrorHandler((error, request, reply) => {
  if (error.validation) {
    reply.status(400).send({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Validation failed',
      details: error.validation
    })
  } else {
    reply.send(error)
  }
})
```

## Shared Schemas with `addSchema`

Reuse schemas across routes for consistency and performance.

```javascript
// Register shared schemas
fastify.addSchema({
  $id: 'user',
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    email: { type: 'string', format: 'email' },
    name: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' }
  }
})

fastify.addSchema({
  $id: 'userList',
  type: 'object',
  properties: {
    users: {
      type: 'array',
      items: { $ref: 'user#' }  // Reference shared schema
    },
    total: { type: 'integer' }
  }
})

// Use in routes
fastify.get('/users/:id', {
  schema: {
    response: {
      200: { $ref: 'user#' }
    }
  }
}, async (request) => {
  return await getUser(request.params.id)
})

fastify.get('/users', {
  schema: {
    response: {
      200: { $ref: 'userList#' }
    }
  }
}, async () => {
  const users = await getUsers()
  return { users, total: users.length }
})
```

### Nested Schema References

```javascript
fastify.addSchema({
  $id: 'address',
  type: 'object',
  properties: {
    street: { type: 'string' },
    city: { type: 'string' },
    zipCode: { type: 'string', pattern: '^\\d{5}$' }
  }
})

fastify.addSchema({
  $id: 'userWithAddress',
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    address: { $ref: 'address#' }  // Nested reference
  }
})
```

## Fluent Schema

Type-safe schema builder with a fluent API.

### Installation

```bash
npm install fluent-json-schema
```

### Basic Usage

```javascript
const S = require('fluent-json-schema')

const userSchema = S.object()
  .prop('id', S.string().format('uuid').required())
  .prop('email', S.string().format('email').required())
  .prop('name', S.string().minLength(1).maxLength(100).required())
  .prop('age', S.integer().minimum(0).maximum(150))
  .additionalProperties(false)

fastify.post('/users', {
  schema: {
    body: userSchema,
    response: {
      201: userSchema
    }
  }
}, handler)
```

### Advanced Patterns

```javascript
// Reusable schemas
const idSchema = S.string().format('uuid')
const timestampSchema = S.string().format('date-time')

const baseEntitySchema = S.object()
  .prop('id', idSchema.required())
  .prop('createdAt', timestampSchema.required())
  .prop('updatedAt', timestampSchema.required())

// Extend base schema
const userSchema = baseEntitySchema
  .prop('email', S.string().format('email').required())
  .prop('name', S.string().required())

// Arrays
const userListSchema = S.object()
  .prop('users', S.array().items(userSchema))
  .prop('total', S.integer())

// Enums
const statusSchema = S.string().enum(['active', 'inactive', 'pending'])

// Conditional schemas
const createUserSchema = S.object()
  .prop('email', S.string().format('email').required())
  .prop('password', S.string().minLength(8).required())

const updateUserSchema = S.object()
  .prop('email', S.string().format('email'))
  .prop('name', S.string())
  .minProperties(1)  // At least one field required

// Nested objects
const addressSchema = S.object()
  .prop('street', S.string().required())
  .prop('city', S.string().required())
  .prop('zipCode', S.string().pattern('^\\d{5}$').required())

const userWithAddressSchema = S.object()
  .prop('name', S.string().required())
  .prop('address', addressSchema.required())

// References
const userRefSchema = S.object()
  .id('user')
  .prop('id', S.string())
  .prop('email', S.string())

fastify.addSchema(userRefSchema.valueOf())

const postSchema = S.object()
  .prop('title', S.string().required())
  .prop('author', S.ref('user#'))  // Reference
```

### With TypeScript

```typescript
import S, { JSONSchema } from 'fluent-json-schema'

const userSchema = S.object()
  .prop('id', S.string().format('uuid').required())
  .prop('email', S.string().format('email').required())
  .prop('name', S.string().required())
  .additionalProperties(false)

type User = {
  id: string
  email: string
  name: string
}

fastify.post<{ Body: User, Reply: User }>('/users', {
  schema: {
    body: userSchema,
    response: {
      201: userSchema
    }
  }
}, async (request, reply) => {
  // request.body is typed as User
  const user = await createUser(request.body)
  reply.code(201)
  return user  // return type is User
})
```

## TypeBox

Runtime type-checking with TypeScript integration.

### Installation

```bash
npm install @sinclair/typebox
```

### Basic Usage

```javascript
const { Type } = require('@sinclair/typebox')

const UserSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  email: Type.String({ format: 'email' }),
  name: Type.String({ minLength: 1, maxLength: 100 }),
  age: Type.Optional(Type.Integer({ minimum: 0, maximum: 150 })),
  roles: Type.Array(Type.String())
})

fastify.post('/users', {
  schema: {
    body: UserSchema,
    response: {
      201: UserSchema
    }
  }
}, handler)
```

### TypeBox with TypeScript

```typescript
import { Type, Static } from '@sinclair/typebox'

const UserSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  email: Type.String({ format: 'email' }),
  name: Type.String(),
  createdAt: Type.String({ format: 'date-time' })
})

// Infer TypeScript type from schema
type User = Static<typeof UserSchema>

fastify.post<{ Body: User, Reply: User }>('/users', {
  schema: {
    body: UserSchema,
    response: {
      201: UserSchema
    }
  }
}, async (request, reply) => {
  const user: User = request.body  // Fully typed!
  return user
})
```

### Advanced TypeBox Patterns

```typescript
import { Type, Static } from '@sinclair/typebox'

// Enums
const StatusSchema = Type.Union([
  Type.Literal('active'),
  Type.Literal('inactive'),
  Type.Literal('pending')
])

// Discriminated unions
const EventSchema = Type.Union([
  Type.Object({
    type: Type.Literal('user.created'),
    userId: Type.String(),
    email: Type.String()
  }),
  Type.Object({
    type: Type.Literal('user.deleted'),
    userId: Type.String()
  })
])

// Recursive types
const TreeNodeSchema = Type.Recursive(This => Type.Object({
  value: Type.String(),
  children: Type.Array(This)
}))

// Intersections
const TimestampSchema = Type.Object({
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' })
})

const UserWithTimestamps = Type.Intersect([
  UserSchema,
  TimestampSchema
])

// Partial and Pick
const UpdateUserSchema = Type.Partial(UserSchema)  // All fields optional
const UserIdSchema = Type.Pick(UserSchema, ['id'])  // Only 'id' field

// Generic schemas
function createListSchema<T>(itemSchema: T) {
  return Type.Object({
    items: Type.Array(itemSchema),
    total: Type.Integer(),
    page: Type.Integer(),
    perPage: Type.Integer()
  })
}

const UserListSchema = createListSchema(UserSchema)
```

### TypeBox Custom Formats

```typescript
import Ajv from 'ajv'
import addFormats from 'ajv-formats'

const ajv = new Ajv()
addFormats(ajv)

// Add custom format
ajv.addFormat('phone', {
  validate: (value: string) => /^\+?[1-9]\d{1,14}$/.test(value)
})

const ContactSchema = Type.Object({
  name: Type.String(),
  phone: Type.String({ format: 'phone' })
})
```

## Schema Organization

### Centralized Schema Module

```javascript
// schemas/index.js
const S = require('fluent-json-schema')

// Base schemas
const id = S.string().format('uuid')
const timestamp = S.string().format('date-time')

// Entity schemas
const user = S.object()
  .id('user')
  .prop('id', id.required())
  .prop('email', S.string().format('email').required())
  .prop('name', S.string().required())
  .prop('createdAt', timestamp.required())

const post = S.object()
  .id('post')
  .prop('id', id.required())
  .prop('title', S.string().required())
  .prop('content', S.string().required())
  .prop('authorId', id.required())
  .prop('createdAt', timestamp.required())

// Request/Response schemas
const createUserRequest = S.object()
  .prop('email', S.string().format('email').required())
  .prop('name', S.string().required())

const createUserResponse = user

const getUserResponse = user

const listUsersResponse = S.object()
  .prop('users', S.array().items(user))
  .prop('total', S.integer())

module.exports = {
  user,
  post,
  createUserRequest,
  createUserResponse,
  getUserResponse,
  listUsersResponse
}

// Register all schemas
// app.js
const schemas = require('./schemas')

for (const schema of Object.values(schemas)) {
  if (schema.valueOf().$id) {
    fastify.addSchema(schema.valueOf())
  }
}

// Use in routes
// routes/users.js
fastify.post('/users', {
  schema: {
    body: schemas.createUserRequest,
    response: {
      201: schemas.createUserResponse
    }
  }
}, handler)
```

### Domain-Based Organization

```
schemas/
├── common/
│   ├── id.js
│   ├── timestamp.js
│   └── pagination.js
├── users/
│   ├── user.js
│   ├── create-user.js
│   └── update-user.js
├── posts/
│   ├── post.js
│   ├── create-post.js
│   └── update-post.js
└── index.js
```

```javascript
// schemas/common/id.js
const S = require('fluent-json-schema')
module.exports = S.string().format('uuid')

// schemas/users/user.js
const S = require('fluent-json-schema')
const id = require('../common/id')
const timestamp = require('../common/timestamp')

module.exports = S.object()
  .id('user')
  .prop('id', id.required())
  .prop('email', S.string().format('email').required())
  .prop('name', S.string().required())
  .prop('createdAt', timestamp.required())
  .prop('updatedAt', timestamp.required())

// schemas/index.js
module.exports = {
  user: require('./users/user'),
  createUser: require('./users/create-user'),
  updateUser: require('./users/update-user'),
  post: require('./posts/post'),
  // ...
}
```

## Performance Best Practices

### 1. Use Serialization Schemas

```javascript
// Without response schema
fastify.get('/users', async () => {
  const users = await db.query('SELECT * FROM users')
  return users  // Uses JSON.stringify() - slower
})

// With response schema
fastify.get('/users', {
  schema: {
    response: {
      200: {
        type: 'array',
        items: { $ref: 'user#' }
      }
    }
  }
}, async () => {
  const users = await db.query('SELECT * FROM users')
  return users  // Uses fast-json-stringify - 2-3x faster
})
```

### 2. Share Schema Definitions

```javascript
// BAD - Schema compiled multiple times
fastify.get('/user/:id', {
  schema: {
    response: {
      200: {
        type: 'object',
        properties: { id: { type: 'string' }, name: { type: 'string' } }
      }
    }
  }
}, handler1)

fastify.post('/user', {
  schema: {
    response: {
      201: {
        type: 'object',
        properties: { id: { type: 'string' }, name: { type: 'string' } }
      }
    }
  }
}, handler2)

// GOOD - Schema compiled once, referenced multiple times
fastify.addSchema({
  $id: 'user',
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' }
  }
})

fastify.get('/user/:id', {
  schema: { response: { 200: { $ref: 'user#' } } }
}, handler1)

fastify.post('/user', {
  schema: { response: { 201: { $ref: 'user#' } } }
}, handler2)
```

### 3. Use `additionalProperties: false`

```javascript
// Faster validation when rejecting unknown fields
const schema = {
  type: 'object',
  required: ['email', 'name'],
  properties: {
    email: { type: 'string' },
    name: { type: 'string' }
  },
  additionalProperties: false  // Rejects { email, name, unknownField }
}
```

### 4. Compile Schemas at Startup

```javascript
// Schemas are compiled when routes are registered
// Register all routes at startup, not dynamically at runtime

// BAD - Dynamic route registration
fastify.get('/dynamic', async (request, reply) => {
  fastify.get('/new-route', { schema: {...} }, handler)  // Compiled at runtime!
})

// GOOD - All routes registered at startup
fastify.register(async (fastify) => {
  fastify.get('/route1', { schema: {...} }, handler1)
  fastify.get('/route2', { schema: {...} }, handler2)
})
```

## OpenAPI/Swagger Generation

```javascript
await fastify.register(require('@fastify/swagger'), {
  openapi: {
    info: {
      title: 'My API',
      version: '1.0.0'
    }
  }
})

await fastify.register(require('@fastify/swagger-ui'), {
  routePrefix: '/docs'
})

// Schemas automatically generate OpenAPI docs
fastify.get('/users/:id', {
  schema: {
    description: 'Get user by ID',
    tags: ['users'],
    params: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' }
      }
    },
    response: {
      200: {
        description: 'Successful response',
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string' },
          name: { type: 'string' }
        }
      },
      404: {
        description: 'User not found',
        type: 'object',
        properties: {
          error: { type: 'string' }
        }
      }
    }
  }
}, handler)

// Access docs at http://localhost:3000/docs
```
