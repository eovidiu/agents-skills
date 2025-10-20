# React Testing Library Best Practices

## Core Philosophy

React Testing Library encourages testing components the way users interact with them. If your test uses implementation details, you're testing wrong.

**Guiding Principle:** "The more your tests resemble the way your software is used, the more confidence they can give you."

## Query Priority

Always prefer queries that reflect user behavior.

### Priority Order

1. **Accessible Queries** (users and screen readers)
   - `getByRole`
   - `getByLabelText`
   - `getByPlaceholderText`
   - `getByText`

2. **Semantic Queries** (meaningful to users)
   - `getByDisplayValue`

3. **Test IDs** (last resort)
   - `getByTestId`

### Examples

```javascript
// ✅ BEST - Accessible and semantic
screen.getByRole('button', { name: /submit/i })
screen.getByLabelText(/email address/i)
screen.getByText(/welcome back/i)

// ⚠️ OK - Less semantic but acceptable
screen.getByPlaceholderText('Enter your email')
screen.getByDisplayValue('John Doe')

// ❌ AVOID - Implementation detail
screen.getByTestId('submit-button')

// ❌ NEVER - Testing implementation
container.querySelector('.submit-button')
wrapper.find('SubmitButton')
```

## Testing User Interactions

### Clicking Elements

```javascript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

test('toggles accordion on click', async () => {
  const user = userEvent.setup()
  render(<Accordion title="Details">Content here</Accordion>)

  // Initially closed
  expect(screen.queryByText('Content here')).not.toBeInTheDocument()

  // Click to open
  await user.click(screen.getByRole('button', { name: /details/i }))

  expect(screen.getByText('Content here')).toBeInTheDocument()

  // Click to close
  await user.click(screen.getByRole('button', { name: /details/i }))

  expect(screen.queryByText('Content here')).not.toBeInTheDocument()
})
```

### Typing in Inputs

```javascript
test('updates email field', async () => {
  const user = userEvent.setup()
  render(<LoginForm />)

  const emailInput = screen.getByLabelText(/email/i)

  await user.type(emailInput, 'alice@example.com')

  expect(emailInput).toHaveValue('alice@example.com')
})

// Prefer user.type over fireEvent.change
test('handles paste event', async () => {
  const user = userEvent.setup()
  render(<SearchBar />)

  const input = screen.getByRole('searchbox')

  // Simulates full user interaction
  await user.click(input)
  await user.paste('React Testing Library')

  expect(input).toHaveValue('React Testing Library')
})
```

### Form Submission

```javascript
test('submits form with valid data', async () => {
  const user = userEvent.setup()
  const handleSubmit = jest.fn()

  render(<ContactForm onSubmit={handleSubmit} />)

  // Fill out form
  await user.type(screen.getByLabelText(/name/i), 'Alice')
  await user.type(screen.getByLabelText(/email/i), 'alice@example.com')
  await user.type(screen.getByLabelText(/message/i), 'Hello!')

  // Submit
  await user.click(screen.getByRole('button', { name: /send/i }))

  expect(handleSubmit).toHaveBeenCalledWith({
    name: 'Alice',
    email: 'alice@example.com',
    message: 'Hello!'
  })
})
```

## Async Testing

### Waiting for Elements

```javascript
import { render, screen, waitFor } from '@testing-library/react'

test('displays user data after loading', async () => {
  render(<UserProfile userId={1} />)

  // Shows loading state
  expect(screen.getByText(/loading/i)).toBeInTheDocument()

  // Wait for data to load
  await waitFor(() => {
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  // Loading state is gone
  expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
})

// Or use findBy (combines getBy + waitFor)
test('displays user data after loading', async () => {
  render(<UserProfile userId={1} />)

  expect(await screen.findByText('Alice')).toBeInTheDocument()
})
```

### Waiting for Disappearance

```javascript
test('hides error message after timeout', async () => {
  jest.useFakeTimers()
  render(<Toast message="Error occurred" duration={3000} />)

  expect(screen.getByText('Error occurred')).toBeInTheDocument()

  // Fast-forward time
  act(() => {
    jest.advanceTimersByTime(3000)
  })

  await waitFor(() => {
    expect(screen.queryByText('Error occurred')).not.toBeInTheDocument()
  })

  jest.useRealTimers()
})
```

## Testing Hooks

### Custom Hooks

```javascript
import { renderHook, waitFor } from '@testing-library/react'
import { useData } from './useData'

test('fetches data on mount', async () => {
  const { result } = renderHook(() => useData('/api/users'))

  // Initial state
  expect(result.current.data).toBeNull()
  expect(result.current.loading).toBe(true)

  // Wait for data
  await waitFor(() => {
    expect(result.current.loading).toBe(false)
  })

  expect(result.current.data).toEqual([{ id: 1, name: 'Alice' }])
})

test('refetches data when called', async () => {
  const { result } = renderHook(() => useData('/api/users'))

  await waitFor(() => expect(result.current.loading).toBe(false))

  // Trigger refetch
  act(() => {
    result.current.refetch()
  })

  expect(result.current.loading).toBe(true)

  await waitFor(() => expect(result.current.loading).toBe(false))
})
```

### Hooks with Context

```javascript
test('uses theme from context', () => {
  const wrapper = ({ children }) => (
    <ThemeProvider theme="dark">{children}</ThemeProvider>
  )

  const { result } = renderHook(() => useTheme(), { wrapper })

  expect(result.current.theme).toBe('dark')
})
```

## Testing Context Providers

```javascript
test('provides auth context to children', async () => {
  const user = userEvent.setup()

  render(
    <AuthProvider>
      <LoginForm />
      <UserProfile />
    </AuthProvider>
  )

  // Not logged in
  expect(screen.queryByText(/welcome/i)).not.toBeInTheDocument()

  // Log in
  await user.type(screen.getByLabelText(/email/i), 'alice@example.com')
  await user.type(screen.getByLabelText(/password/i), 'password123')
  await user.click(screen.getByRole('button', { name: /login/i }))

  // Logged in
  await waitFor(() => {
    expect(screen.getByText(/welcome, alice/i)).toBeInTheDocument()
  })
})
```

## Testing Component State

### Don't Test State Directly

```javascript
// ❌ BAD - Testing implementation
test('toggles isOpen state', () => {
  const wrapper = shallow(<Modal />)
  expect(wrapper.state('isOpen')).toBe(false)

  wrapper.find('button').simulate('click')

  expect(wrapper.state('isOpen')).toBe(true)
})

// ✅ GOOD - Testing behavior
test('shows modal on button click', async () => {
  const user = userEvent.setup()
  render(<Modal />)

  // Modal not visible
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

  // Click trigger
  await user.click(screen.getByRole('button', { name: /open/i }))

  // Modal visible
  expect(screen.getByRole('dialog')).toBeInTheDocument()
})
```

## Testing Props

```javascript
// ❌ BAD - Testing that props are passed
test('passes onClick to button', () => {
  const onClick = jest.fn()
  const wrapper = shallow(<Button onClick={onClick} />)

  expect(wrapper.find('button').prop('onClick')).toBe(onClick)
})

// ✅ GOOD - Testing that clicking works
test('calls onClick when clicked', async () => {
  const user = userEvent.setup()
  const handleClick = jest.fn()

  render(<Button onClick={handleClick}>Click me</Button>)

  await user.click(screen.getByRole('button', { name: /click me/i }))

  expect(handleClick).toHaveBeenCalledTimes(1)
})
```

## Testing Conditional Rendering

```javascript
test('shows error message on validation failure', async () => {
  const user = userEvent.setup()
  render(<LoginForm />)

  // Submit without filling email
  await user.click(screen.getByRole('button', { name: /login/i }))

  expect(screen.getByText(/email is required/i)).toBeInTheDocument()

  // Fill email, error disappears
  await user.type(screen.getByLabelText(/email/i), 'alice@example.com')

  expect(screen.queryByText(/email is required/i)).not.toBeInTheDocument()
})
```

## Testing Lists and Iterations

```javascript
test('renders all todo items', () => {
  const todos = [
    { id: 1, text: 'Buy milk', completed: false },
    { id: 2, text: 'Walk dog', completed: true },
    { id: 3, text: 'Write tests', completed: false }
  ]

  render(<TodoList todos={todos} />)

  expect(screen.getByText('Buy milk')).toBeInTheDocument()
  expect(screen.getByText('Walk dog')).toBeInTheDocument()
  expect(screen.getByText('Write tests')).toBeInTheDocument()

  // Check completed state
  const completedItems = screen.getAllByRole('checkbox', { checked: true })
  expect(completedItems).toHaveLength(1)
})
```

## Accessibility Testing

```javascript
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

test('has no accessibility violations', async () => {
  const { container } = render(<LoginForm />)

  const results = await axe(container)

  expect(results).toHaveNoViolations()
})

test('supports keyboard navigation', async () => {
  const user = userEvent.setup()
  render(<Dropdown options={['Red', 'Green', 'Blue']} />)

  const trigger = screen.getByRole('button', { name: /select color/i })

  // Open with Enter
  await user.click(trigger)
  await user.keyboard('{Enter}')

  // Navigate with arrows
  await user.keyboard('{ArrowDown}')
  await user.keyboard('{ArrowDown}')

  // Select with Enter
  await user.keyboard('{Enter}')

  expect(trigger).toHaveTextContent('Blue')
})
```

## Testing Error Boundaries

```javascript
test('catches errors and displays fallback', () => {
  const ThrowError = () => {
    throw new Error('Test error')
  }

  // Suppress console.error for this test
  const spy = jest.spyOn(console, 'error').mockImplementation()

  render(
    <ErrorBoundary fallback={<div>Something went wrong</div>}>
      <ThrowError />
    </ErrorBoundary>
  )

  expect(screen.getByText('Something went wrong')).toBeInTheDocument()

  spy.mockRestore()
})
```

## Custom Render Function

Create a custom render for common providers:

```javascript
// test-utils.js
import { render } from '@testing-library/react'
import { ThemeProvider } from './ThemeProvider'
import { AuthProvider } from './AuthProvider'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'

const AllTheProviders = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>{children}</ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

const customRender = (ui, options) =>
  render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }

// Usage in tests
import { render, screen } from './test-utils'

test('renders with all providers', () => {
  render(<App />)
  // Component has access to theme, auth, and react-query
})
```

## Common Patterns

### Loading States

```javascript
test('shows skeleton while loading', async () => {
  render(<UserList />)

  expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument()

  await waitFor(() => {
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  expect(screen.getAllByRole('listitem')).toHaveLength(3)
})
```

### Empty States

```javascript
test('shows empty state when no data', async () => {
  server.use(
    rest.get('/api/users', (req, res, ctx) => {
      return res(ctx.json([]))
    })
  )

  render(<UserList />)

  expect(await screen.findByText(/no users found/i)).toBeInTheDocument()
})
```

### Error States

```javascript
test('shows error message on fetch failure', async () => {
  server.use(
    rest.get('/api/users', (req, res, ctx) => {
      return res(ctx.status(500), ctx.json({ error: 'Server error' }))
    })
  )

  render(<UserList />)

  expect(await screen.findByText(/failed to load users/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
})
```

### Debounced Input

```javascript
test('debounces search input', async () => {
  jest.useFakeTimers()
  const user = userEvent.setup({ delay: null })

  render(<SearchBar onSearch={mockSearch} />)

  const input = screen.getByRole('searchbox')

  await user.type(input, 'test')

  // Hasn't been called yet
  expect(mockSearch).not.toHaveBeenCalled()

  // Fast-forward debounce delay
  act(() => {
    jest.advanceTimersByTime(500)
  })

  expect(mockSearch).toHaveBeenCalledWith('test')

  jest.useRealTimers()
})
```

## Anti-Patterns to Avoid

### ❌ Testing Implementation Details

```javascript
// BAD
expect(wrapper.find('.error-message').exists()).toBe(true)
expect(component.state.hasError).toBe(true)
expect(instance.handleClick).toBeDefined()

// GOOD
expect(screen.getByText(/error occurred/i)).toBeInTheDocument()
```

### ❌ Using container.querySelector

```javascript
// BAD
const button = container.querySelector('.submit-button')

// GOOD
const button = screen.getByRole('button', { name: /submit/i })
```

### ❌ Testing Too Much in One Test

```javascript
// BAD - Giant test doing everything
test('complete user flow', async () => {
  // 100 lines of interactions...
})

// GOOD - Focused tests
test('logs in with valid credentials', async () => {})
test('shows error with invalid credentials', async () => {})
test('redirects to dashboard after login', async () => {})
```

### ❌ Not Cleaning Up Timers/Mocks

```javascript
// BAD
test('test 1', () => {
  jest.useFakeTimers()
  // ...
})

test('test 2', () => {
  // Still using fake timers! 😱
})

// GOOD
afterEach(() => {
  jest.useRealTimers()
})
```

## Best Practices Summary

1. **Query by role/label first**, test IDs last
2. **Use userEvent** over fireEvent for realistic interactions
3. **Test behavior**, not implementation
4. **Wait for async changes** with waitFor or findBy
5. **Clean up** after each test (timers, mocks, servers)
6. **Keep tests focused** - one behavior per test
7. **Write accessible components** - if you can't query it, users can't use it
8. **Mock external APIs**, not your components

Remember: If your test breaks when you refactor but behavior doesn't change, you're testing implementation details.
