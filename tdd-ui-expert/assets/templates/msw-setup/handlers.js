import { rest } from 'msw'

// Default API handlers for tests
export const handlers = [
  // Users API
  rest.get('/api/users', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([
        { id: 1, name: 'Alice', email: 'alice@example.com' },
        { id: 2, name: 'Bob', email: 'bob@example.com' }
      ])
    )
  }),

  rest.get('/api/users/:id', (req, res, ctx) => {
    const { id } = req.params

    return res(
      ctx.json({
        id: parseInt(id),
        name: 'Alice',
        email: 'alice@example.com'
      })
    )
  }),

  rest.post('/api/users', async (req, res, ctx) => {
    const newUser = await req.json()

    return res(
      ctx.status(201),
      ctx.json({
        id: Math.floor(Math.random() * 1000),
        ...newUser
      })
    )
  }),

  // Add more default handlers as needed
]
