import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FormComponent } from './FormComponent'

describe('FormComponent', () => {
  test('validates required fields', async () => {
    const user = userEvent.setup()
    render(<FormComponent />)

    // Submit empty form
    await user.click(screen.getByRole('button', { name: /submit/i }))

    // Validation errors appear
    expect(screen.getByText(/field is required/i)).toBeInTheDocument()
  })

  test('submits form with valid data', async () => {
    const user = userEvent.setup()
    const handleSubmit = jest.fn()

    render(<FormComponent onSubmit={handleSubmit} />)

    // Fill out form
    await user.type(screen.getByLabelText(/name/i), 'Alice')
    await user.type(screen.getByLabelText(/email/i), 'alice@example.com')

    // Submit
    await user.click(screen.getByRole('button', { name: /submit/i }))

    expect(handleSubmit).toHaveBeenCalledWith({
      name: 'Alice',
      email: 'alice@example.com'
    })
  })

  test('shows success message after submission', async () => {
    const user = userEvent.setup()
    render(<FormComponent />)

    await user.type(screen.getByLabelText(/name/i), 'Alice')
    await user.type(screen.getByLabelText(/email/i), 'alice@example.com')
    await user.click(screen.getByRole('button', { name: /submit/i }))

    expect(await screen.findByText(/success/i)).toBeInTheDocument()
  })

  test('disables submit button while submitting', async () => {
    const user = userEvent.setup()
    render(<FormComponent />)

    await user.type(screen.getByLabelText(/name/i), 'Alice')
    await user.type(screen.getByLabelText(/email/i), 'alice@example.com')

    const submitButton = screen.getByRole('button', { name: /submit/i })

    await user.click(submitButton)

    expect(submitButton).toBeDisabled()

    await waitFor(() => {
      expect(submitButton).toBeEnabled()
    })
  })
})
