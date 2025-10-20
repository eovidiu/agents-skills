import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ComponentName } from './ComponentName'

describe('ComponentName', () => {
  test('renders initial state', () => {
    render(<ComponentName />)

    expect(screen.getByRole('heading', { name: /component title/i })).toBeInTheDocument()
  })

  test('handles user interaction', async () => {
    const user = userEvent.setup()
    render(<ComponentName />)

    await user.click(screen.getByRole('button', { name: /action/i }))

    expect(screen.getByText(/result/i)).toBeInTheDocument()
  })

  test('displays loading state', async () => {
    render(<ComponentName />)

    expect(screen.getByText(/loading/i)).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
    })
  })

  test('handles error state', async () => {
    // Mock API error here if needed

    render(<ComponentName />)

    expect(await screen.findByText(/error/i)).toBeInTheDocument()
  })
})
