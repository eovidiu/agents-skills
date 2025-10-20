import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { rest } from 'msw'
import { server } from '../mocks/server'
import { DataComponent } from './DataComponent'

describe('DataComponent - API Integration', () => {
  test('loads and displays data', async () => {
    server.use(
      rest.get('/api/data', (req, res, ctx) => {
        return res(
          ctx.json([
            { id: 1, name: 'Item 1' },
            { id: 2, name: 'Item 2' }
          ])
        )
      })
    )

    render(<DataComponent />)

    // Shows loading state
    expect(screen.getByText(/loading/i)).toBeInTheDocument()

    // Data appears
    expect(await screen.findByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('Item 2')).toBeInTheDocument()

    // Loading state gone
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
  })

  test('handles API error', async () => {
    server.use(
      rest.get('/api/data', (req, res, ctx) => {
        return res(
          ctx.status(500),
          ctx.json({ error: 'Server error' })
        )
      })
    )

    render(<DataComponent />)

    expect(await screen.findByText(/error/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  test('retries on error', async () => {
    const user = userEvent.setup()
    let attempts = 0

    server.use(
      rest.get('/api/data', (req, res, ctx) => {
        attempts++

        if (attempts === 1) {
          return res.networkError('Connection failed')
        }

        return res(ctx.json([{ id: 1, name: 'Success' }]))
      })
    )

    render(<DataComponent />)

    // Error appears
    expect(await screen.findByText(/error/i)).toBeInTheDocument()

    // Retry
    await user.click(screen.getByRole('button', { name: /retry/i }))

    // Success after retry
    expect(await screen.findByText('Success')).toBeInTheDocument()
    expect(attempts).toBe(2)
  })

  test('sends correct request parameters', async () => {
    let receivedParams = null

    server.use(
      rest.get('/api/data', (req, res, ctx) => {
        receivedParams = {
          page: req.url.searchParams.get('page'),
          limit: req.url.searchParams.get('limit')
        }

        return res(ctx.json([]))
      })
    )

    render(<DataComponent page={2} limit={10} />)

    await waitFor(() => {
      expect(receivedParams).toEqual({ page: '2', limit: '10' })
    })
  })
})
