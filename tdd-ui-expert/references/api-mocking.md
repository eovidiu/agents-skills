# API Mocking with Mock Service Worker (MSW)

## Why MSW?

Mock Service Worker intercepts network requests at the **network level**, not the module level. This means:

✅ Your components make real HTTP requests
✅ You test actual fetch/axios code
✅ Works in both tests and browser
✅ No need to mock modules
✅ Tests closer to production behavior

## Setup

### Installation

```bash
npm install --save-dev msw
```

### Basic Server Setup

```javascript
// src/mocks/server.js
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)

// src/mocks/handlers.js
import { rest } from 'msw'

export const handlers = [
  rest.get('/api/users', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([
        { id: 1, name: 'Alice', email: 'alice@example.com' },
        { id: 2, name: 'Bob', email: 'bob@example.com' }
      ])
    )
  }),

  rest.post('/api/users', (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({ id: 3, ...req.body })
    )
  })
]

// src/setupTests.js
import { server } from './mocks/server'

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

## Basic Patterns

### GET Request

```javascript
import { rest } from 'msw'
import { server } from './mocks/server'

test('displays user data', async () => {
  server.use(
    rest.get('/api/users/:id', (req, res, ctx) => {
      const { id } = req.params

      return res(
        ctx.json({
          id: parseInt(id),
          name: 'Alice',
          email: 'alice@example.com'
        })
      )
    })
  )

  render(<UserProfile userId={1} />)

  expect(await screen.findByText('Alice')).toBeInTheDocument()
  expect(screen.getByText('alice@example.com')).toBeInTheDocument()
})
```

### POST Request

```javascript
test('creates new user', async () => {
  const user = userEvent.setup()
  let createdUser = null

  server.use(
    rest.post('/api/users', async (req, res, ctx) => {
      createdUser = await req.json()

      return res(
        ctx.status(201),
        ctx.json({
          id: 123,
          ...createdUser
        })
      )
    })
  )

  render(<CreateUserForm />)

  await user.type(screen.getByLabelText(/name/i), 'Alice')
  await user.type(screen.getByLabelText(/email/i), 'alice@example.com')
  await user.click(screen.getByRole('button', { name: /create/i }))

  await waitFor(() => {
    expect(screen.getByText(/user created/i)).toBeInTheDocument()
  })

  expect(createdUser).toEqual({
    name: 'Alice',
    email: 'alice@example.com'
  })
})
```

### PUT/PATCH Request

```javascript
test('updates user profile', async () => {
  const user = userEvent.setup()

  server.use(
    rest.patch('/api/users/:id', async (req, res, ctx) => {
      const { id } = req.params
      const updates = await req.json()

      return res(
        ctx.json({
          id: parseInt(id),
          name: 'Alice',
          ...updates
        })
      )
    })
  )

  render(<EditProfile userId={1} />)

  await user.clear(screen.getByLabelText(/name/i))
  await user.type(screen.getByLabelText(/name/i), 'Alice Updated')
  await user.click(screen.getByRole('button', { name: /save/i }))

  expect(await screen.findByText(/profile updated/i)).toBeInTheDocument()
})
```

### DELETE Request

```javascript
test('deletes user', async () => {
  const user = userEvent.setup()

  server.use(
    rest.delete('/api/users/:id', (req, res, ctx) => {
      return res(ctx.status(204))
    })
  )

  render(<UserList />)

  await user.click(screen.getByRole('button', { name: /delete alice/i }))

  await waitFor(() => {
    expect(screen.queryByText('Alice')).not.toBeInTheDocument()
  })
})
```

## Error Handling

### Network Error

```javascript
test('shows error on network failure', async () => {
  server.use(
    rest.get('/api/users', (req, res, ctx) => {
      return res.networkError('Failed to connect')
    })
  )

  render(<UserList />)

  expect(await screen.findByText(/network error/i)).toBeInTheDocument()
})
```

### HTTP Error Responses

```javascript
test('handles 404 not found', async () => {
  server.use(
    rest.get('/api/users/:id', (req, res, ctx) => {
      return res(
        ctx.status(404),
        ctx.json({ error: 'User not found' })
      )
    })
  )

  render(<UserProfile userId={999} />)

  expect(await screen.findByText(/user not found/i)).toBeInTheDocument()
})

test('handles 500 server error', async () => {
  server.use(
    rest.get('/api/users', (req, res, ctx) => {
      return res(
        ctx.status(500),
        ctx.json({ error: 'Internal server error' })
      )
    })
  )

  render(<UserList />)

  expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
})
```

### Validation Errors

```javascript
test('displays validation errors', async () => {
  const user = userEvent.setup()

  server.use(
    rest.post('/api/users', (req, res, ctx) => {
      return res(
        ctx.status(422),
        ctx.json({
          errors: {
            email: 'Email is already taken',
            password: 'Password must be at least 8 characters'
          }
        })
      )
    })
  )

  render(<SignupForm />)

  await user.type(screen.getByLabelText(/email/i), 'alice@example.com')
  await user.type(screen.getByLabelText(/password/i), '123')
  await user.click(screen.getByRole('button', { name: /sign up/i }))

  expect(await screen.findByText(/email is already taken/i)).toBeInTheDocument()
  expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument()
})
```

## Advanced Patterns

### Query Parameters

```javascript
test('filters users by status', async () => {
  server.use(
    rest.get('/api/users', (req, res, ctx) => {
      const status = req.url.searchParams.get('status')

      const users = [
        { id: 1, name: 'Alice', status: 'active' },
        { id: 2, name: 'Bob', status: 'inactive' }
      ]

      const filtered = status
        ? users.filter(u => u.status === status)
        : users

      return res(ctx.json(filtered))
    })
  )

  render(<UserList />)

  await userEvent.click(screen.getByRole('button', { name: /filter: active/i }))

  await waitFor(() => {
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.queryByText('Bob')).not.toBeInTheDocument()
  })
})
```

### Request Headers

```javascript
test('includes auth token in request', async () => {
  let receivedAuth = null

  server.use(
    rest.get('/api/protected', (req, res, ctx) => {
      receivedAuth = req.headers.get('Authorization')

      if (!receivedAuth) {
        return res(ctx.status(401), ctx.json({ error: 'Unauthorized' }))
      }

      return res(ctx.json({ data: 'Secret data' }))
    })
  )

  render(<ProtectedRoute token="Bearer abc123" />)

  await waitFor(() => {
    expect(screen.getByText('Secret data')).toBeInTheDocument()
  })

  expect(receivedAuth).toBe('Bearer abc123')
})
```

### Response Delays

```javascript
test('shows loading state during fetch', async () => {
  server.use(
    rest.get('/api/users', (req, res, ctx) => {
      return res(
        ctx.delay(100),  // 100ms delay
        ctx.json([{ id: 1, name: 'Alice' }])
      )
    })
  )

  render(<UserList />)

  // Loading state visible
  expect(screen.getByText(/loading/i)).toBeInTheDocument()

  // Data appears after delay
  expect(await screen.findByText('Alice')).toBeInTheDocument()

  // Loading state gone
  expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
})
```

### Conditional Responses

```javascript
test('returns different data based on request', async () => {
  server.use(
    rest.get('/api/users/:id', (req, res, ctx) => {
      const { id } = req.params

      if (id === '1') {
        return res(ctx.json({ id: 1, name: 'Alice', role: 'admin' }))
      }

      if (id === '2') {
        return res(ctx.json({ id: 2, name: 'Bob', role: 'user' }))
      }

      return res(ctx.status(404), ctx.json({ error: 'Not found' }))
    })
  )

  const { rerender } = render(<UserProfile userId={1} />)
  expect(await screen.findByText('admin')).toBeInTheDocument()

  rerender(<UserProfile userId={2} />)
  expect(await screen.findByText('user')).toBeInTheDocument()
})
```

### Stateful Mocks

```javascript
test('updates data across requests', async () => {
  const user = userEvent.setup()
  const users = [
    { id: 1, name: 'Alice', email: 'alice@example.com' }
  ]

  server.use(
    rest.get('/api/users', (req, res, ctx) => {
      return res(ctx.json(users))
    }),

    rest.post('/api/users', async (req, res, ctx) => {
      const newUser = await req.json()
      const created = { id: users.length + 1, ...newUser }
      users.push(created)

      return res(ctx.status(201), ctx.json(created))
    })
  )

  render(<UserManagement />)

  // Initially one user
  expect(await screen.findByText('Alice')).toBeInTheDocument()

  // Add new user
  await user.click(screen.getByRole('button', { name: /add user/i }))
  await user.type(screen.getByLabelText(/name/i), 'Bob')
  await user.type(screen.getByLabelText(/email/i), 'bob@example.com')
  await user.click(screen.getByRole('button', { name: /create/i }))

  // Both users visible
  await waitFor(() => {
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })
})
```

## Testing Authentication Flows

### Login

```javascript
test('logs in and stores token', async () => {
  const user = userEvent.setup()

  server.use(
    rest.post('/api/auth/login', async (req, res, ctx) => {
      const { email, password } = await req.json()

      if (email === 'alice@example.com' && password === 'password123') {
        return res(
          ctx.json({
            token: 'fake-jwt-token',
            user: { id: 1, name: 'Alice' }
          })
        )
      }

      return res(
        ctx.status(401),
        ctx.json({ error: 'Invalid credentials' })
      )
    })
  )

  render(<LoginForm />)

  await user.type(screen.getByLabelText(/email/i), 'alice@example.com')
  await user.type(screen.getByLabelText(/password/i), 'password123')
  await user.click(screen.getByRole('button', { name: /login/i }))

  await waitFor(() => {
    expect(screen.getByText(/welcome, alice/i)).toBeInTheDocument()
  })
})
```

### Authenticated Requests

```javascript
test('includes token in subsequent requests', async () => {
  let authHeader = null

  server.use(
    rest.post('/api/auth/login', (req, res, ctx) => {
      return res(ctx.json({ token: 'fake-token' }))
    }),

    rest.get('/api/profile', (req, res, ctx) => {
      authHeader = req.headers.get('Authorization')

      return res(ctx.json({ name: 'Alice', email: 'alice@example.com' }))
    })
  )

  render(<App />)

  // Login
  await userEvent.click(screen.getByRole('button', { name: /login/i }))

  // Navigate to profile (triggers authenticated request)
  await userEvent.click(screen.getByRole('link', { name: /profile/i }))

  await waitFor(() => {
    expect(screen.getByText('alice@example.com')).toBeInTheDocument()
  })

  expect(authHeader).toBe('Bearer fake-token')
})
```

### Token Refresh

```javascript
test('refreshes expired token', async () => {
  let requestCount = 0

  server.use(
    rest.get('/api/data', (req, res, ctx) => {
      requestCount++

      // First request: token expired
      if (requestCount === 1) {
        return res(
          ctx.status(401),
          ctx.json({ error: 'Token expired' })
        )
      }

      // After refresh: success
      return res(ctx.json({ data: 'Protected data' }))
    }),

    rest.post('/api/auth/refresh', (req, res, ctx) => {
      return res(ctx.json({ token: 'new-token' }))
    })
  )

  render(<ProtectedData />)

  // Eventually shows data after auto-refresh
  expect(await screen.findByText('Protected data')).toBeInTheDocument()
})
```

## File Upload Testing

```javascript
test('uploads file', async () => {
  const user = userEvent.setup()
  let uploadedFile = null

  server.use(
    rest.post('/api/upload', async (req, res, ctx) => {
      const formData = await req.formData()
      uploadedFile = formData.get('file')

      return res(
        ctx.json({
          filename: uploadedFile.name,
          size: uploadedFile.size
        })
      )
    })
  )

  render(<FileUpload />)

  const file = new File(['hello'], 'hello.txt', { type: 'text/plain' })
  const input = screen.getByLabelText(/choose file/i)

  await user.upload(input, file)
  await user.click(screen.getByRole('button', { name: /upload/i }))

  await waitFor(() => {
    expect(screen.getByText(/uploaded: hello.txt/i)).toBeInTheDocument()
  })

  expect(uploadedFile.name).toBe('hello.txt')
})
```

## GraphQL Support

```javascript
import { graphql } from 'msw'

const server = setupServer(
  graphql.query('GetUser', (req, res, ctx) => {
    const { id } = req.variables

    return res(
      ctx.data({
        user: {
          id,
          name: 'Alice',
          email: 'alice@example.com'
        }
      })
    )
  }),

  graphql.mutation('CreateUser', (req, res, ctx) => {
    const { input } = req.variables

    return res(
      ctx.data({
        createUser: {
          id: '123',
          ...input
        }
      })
    )
  })
)

test('fetches user with GraphQL', async () => {
  render(<UserProfile userId="1" />)

  expect(await screen.findByText('Alice')).toBeInTheDocument()
})
```

## Best Practices

### 1. Define Default Handlers

```javascript
// mocks/handlers.js
export const handlers = [
  // Happy path defaults
  rest.get('/api/users', (req, res, ctx) => {
    return res(ctx.json([{ id: 1, name: 'Alice' }]))
  })
]

// Override in specific tests
test('handles empty list', async () => {
  server.use(
    rest.get('/api/users', (req, res, ctx) => {
      return res(ctx.json([]))
    })
  )

  render(<UserList />)
  expect(await screen.findByText(/no users/i)).toBeInTheDocument()
})
```

### 2. Reset Handlers After Each Test

```javascript
// setupTests.js
afterEach(() => {
  server.resetHandlers()  // Reset to default handlers
})
```

### 3. Use Type-Safe Handlers (TypeScript)

```typescript
import { rest } from 'msw'

interface User {
  id: number
  name: string
  email: string
}

const handlers = [
  rest.get<never, never, User[]>('/api/users', (req, res, ctx) => {
    return res(
      ctx.json([
        { id: 1, name: 'Alice', email: 'alice@example.com' }
      ])
    )
  })
]
```

### 4. Don't Mock Internal Functions

```javascript
// ❌ BAD - Mocking your own code
jest.mock('../api/userService')

test('displays users', async () => {
  userService.getUsers.mockResolvedValue([{ id: 1, name: 'Alice' }])
  // Testing nothing useful
})

// ✅ GOOD - Mock the HTTP layer with MSW
server.use(
  rest.get('/api/users', (req, res, ctx) => {
    return res(ctx.json([{ id: 1, name: 'Alice' }]))
  })
)

test('displays users', async () => {
  render(<UserList />)
  // Tests real integration with your API client
})
```

### 5. Test Real Error Scenarios

```javascript
test('retries failed requests', async () => {
  let attempts = 0

  server.use(
    rest.get('/api/users', (req, res, ctx) => {
      attempts++

      if (attempts < 3) {
        return res.networkError('Connection failed')
      }

      return res(ctx.json([{ id: 1, name: 'Alice' }]))
    })
  )

  render(<UserList />)

  // Eventually succeeds after retries
  expect(await screen.findByText('Alice')).toBeInTheDocument()
  expect(attempts).toBe(3)
})
```

## MSW Browser Setup (Optional)

For development and debugging:

```javascript
// src/mocks/browser.js
import { setupWorker } from 'msw'
import { handlers } from './handlers'

export const worker = setupWorker(...handlers)

// src/index.jsx
if (process.env.NODE_ENV === 'development') {
  const { worker } = await import('./mocks/browser')
  worker.start()
}
```

Now your app uses mocked APIs in development too!

## Summary

MSW advantages:
- ✅ Test real network requests
- ✅ Works in tests and browser
- ✅ No module mocking needed
- ✅ Realistic error handling
- ✅ Supports GraphQL
- ✅ Type-safe (TypeScript)

Use MSW to mock **external APIs**, test real integration, and ship confident code.
