# Common Testing Patterns and Anti-Patterns

## Test Organization Patterns

### AAA Pattern (Arrange-Act-Assert)

```javascript
test('adds item to cart', async () => {
  // Arrange - Set up test data and environment
  const user = userEvent.setup()
  const product = { id: 1, name: 'Laptop', price: 999 }
  render(<ProductCard product={product} />)

  // Act - Perform the action
  await user.click(screen.getByRole('button', { name: /add to cart/i }))

  // Assert - Verify the outcome
  expect(screen.getByText(/added to cart/i)).toBeInTheDocument()
})
```

### GWT Pattern (Given-When-Then)

```javascript
test('user can complete checkout', async () => {
  // Given - User has items in cart
  const cart = [{ id: 1, name: 'Laptop', price: 999 }]
  render(<Checkout cart={cart} />)

  // When - User fills out payment form
  await fillPaymentForm({
    cardNumber: '4242424242424242',
    expiry: '12/25',
    cvc: '123'
  })

  await userEvent.click(screen.getByRole('button', { name: /pay/i }))

  // Then - Payment is processed and confirmed
  expect(await screen.findByText(/order confirmed/i)).toBeInTheDocument()
})
```

### Test Helpers for Reusability

```javascript
// test-helpers.js
export async function loginAs(user, role = 'user') {
  const credentials = {
    user: { email: 'user@example.com', password: 'password' },
    admin: { email: 'admin@example.com', password: 'admin123' }
  }

  await userEvent.type(screen.getByLabelText(/email/i), credentials[role].email)
  await userEvent.type(screen.getByLabelText(/password/i), credentials[role].password)
  await userEvent.click(screen.getByRole('button', { name: /login/i }))

  await waitFor(() => {
    expect(screen.getByText(/welcome/i)).toBeInTheDocument()
  })
}

export function createProduct(overrides = {}) {
  return {
    id: 1,
    name: 'Test Product',
    price: 99,
    inStock: true,
    ...overrides
  }
}

// Usage
test('admin can delete products', async () => {
  await loginAs(userEvent.setup(), 'admin')

  const product = createProduct({ name: 'Laptop' })
  render(<ProductList products={[product]} />)

  await userEvent.click(screen.getByRole('button', { name: /delete/i }))

  expect(screen.queryByText('Laptop')).not.toBeInTheDocument()
})
```

## Data Setup Patterns

### Factory Functions

```javascript
// factories/user.js
export function createUser(overrides = {}) {
  return {
    id: Math.random().toString(36),
    name: 'Test User',
    email: 'test@example.com',
    role: 'user',
    createdAt: new Date().toISOString(),
    ...overrides
  }
}

export function createAdmin(overrides = {}) {
  return createUser({ role: 'admin', ...overrides })
}

// Usage
test('displays user role', () => {
  const admin = createAdmin({ name: 'Alice' })

  render(<UserCard user={admin} />)

  expect(screen.getByText('Alice')).toBeInTheDocument()
  expect(screen.getByText('Admin')).toBeInTheDocument()
})
```

### Fixtures

```javascript
// fixtures/products.js
export const products = [
  {
    id: 1,
    name: 'Laptop',
    price: 999,
    category: 'Electronics',
    inStock: true
  },
  {
    id: 2,
    name: 'Headphones',
    price: 199,
    category: 'Electronics',
    inStock: true
  },
  {
    id: 3,
    name: 'Shoes',
    price: 79,
    category: 'Fashion',
    inStock: false
  }
]

// Usage
import { products } from './fixtures/products'

test('filters products by category', async () => {
  render(<ProductList products={products} />)

  await userEvent.click(screen.getByRole('button', { name: /electronics/i }))

  expect(screen.getByText('Laptop')).toBeInTheDocument()
  expect(screen.queryByText('Shoes')).not.toBeInTheDocument()
})
```

## Mocking Patterns

### Mock API Responses

```javascript
// Good: Realistic API responses
server.use(
  rest.get('/api/users/:id', (req, res, ctx) => {
    return res(
      ctx.json({
        id: parseInt(req.params.id),
        name: 'Alice',
        email: 'alice@example.com',
        avatar: 'https://example.com/avatar.jpg',
        preferences: {
          theme: 'dark',
          notifications: true
        }
      })
    )
  })
)

// Bad: Minimal/unrealistic responses
server.use(
  rest.get('/api/users/:id', (req, res, ctx) => {
    return res(ctx.json({ name: 'Alice' }))
  })
)
```

### Mock Third-Party Libraries Sparingly

```javascript
// ✅ GOOD - Mock external API call
jest.mock('stripe', () => ({
  Stripe: jest.fn(() => ({
    charges: {
      create: jest.fn().mockResolvedValue({ id: 'ch_123', status: 'succeeded' })
    }
  }))
}))

// ❌ BAD - Mocking your own components
jest.mock('../components/ProductCard', () => {
  return () => <div>Product Card</div>
})
```

### Spy on Console/Window

```javascript
test('logs error to console', () => {
  const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

  render(<BrokenComponent />)

  expect(consoleSpy).toHaveBeenCalledWith(
    expect.stringContaining('Something went wrong')
  )

  consoleSpy.mockRestore()
})

test('opens window on click', async () => {
  const openSpy = jest.spyOn(window, 'open').mockImplementation()

  render(<ShareButton />)

  await userEvent.click(screen.getByRole('button', { name: /share/i }))

  expect(openSpy).toHaveBeenCalledWith(
    'https://twitter.com/intent/tweet?text=Check+this+out',
    '_blank'
  )

  openSpy.mockRestore()
})
```

## Async Patterns

### Waiting for Elements

```javascript
// ✅ GOOD - Use findBy (implicit waitFor)
test('loads user data', async () => {
  render(<UserProfile userId={1} />)

  expect(await screen.findByText('Alice')).toBeInTheDocument()
})

// ⚠️ OK - Explicit waitFor for complex conditions
test('loads user data', async () => {
  render(<UserProfile userId={1} />)

  await waitFor(() => {
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('alice@example.com')).toBeInTheDocument()
  })
})

// ❌ BAD - Using setTimeout
test('loads user data', async () => {
  render(<UserProfile userId={1} />)

  await new Promise(resolve => setTimeout(resolve, 1000))

  expect(screen.getByText('Alice')).toBeInTheDocument()
})
```

### Testing Debounced Functions

```javascript
test('debounces search input', async () => {
  jest.useFakeTimers()
  const user = userEvent.setup({ delay: null }) // No delay with fake timers

  const mockSearch = jest.fn()
  render(<SearchBar onSearch={mockSearch} />)

  const input = screen.getByRole('searchbox')

  // Type multiple characters
  await user.type(input, 'hello')

  // Not called yet
  expect(mockSearch).not.toHaveBeenCalled()

  // Fast-forward past debounce delay
  act(() => {
    jest.advanceTimersByTime(500)
  })

  // Now it's called
  expect(mockSearch).toHaveBeenCalledWith('hello')
  expect(mockSearch).toHaveBeenCalledTimes(1)

  jest.useRealTimers()
})
```

### Testing Polling/Intervals

```javascript
test('polls for updates every 5 seconds', async () => {
  jest.useFakeTimers()

  const mockFetch = jest.fn()
  render(<LiveData fetch={mockFetch} />)

  // Initial call
  expect(mockFetch).toHaveBeenCalledTimes(1)

  // After 5 seconds
  act(() => {
    jest.advanceTimersByTime(5000)
  })

  expect(mockFetch).toHaveBeenCalledTimes(2)

  // After 10 seconds
  act(() => {
    jest.advanceTimersByTime(5000)
  })

  expect(mockFetch).toHaveBeenCalledTimes(3)

  jest.useRealTimers()
})
```

## Form Testing Patterns

### Multi-Step Forms

```javascript
test('completes multi-step checkout', async () => {
  const user = userEvent.setup()

  render(<CheckoutWizard />)

  // Step 1: Shipping
  expect(screen.getByRole('heading', { name: /shipping/i })).toBeInTheDocument()

  await user.type(screen.getByLabelText(/name/i), 'Alice')
  await user.type(screen.getByLabelText(/address/i), '123 Main St')
  await user.click(screen.getByRole('button', { name: /continue/i }))

  // Step 2: Payment
  expect(screen.getByRole('heading', { name: /payment/i })).toBeInTheDocument()

  await user.type(screen.getByLabelText(/card number/i), '4242424242424242')
  await user.type(screen.getByLabelText(/expiry/i), '12/25')
  await user.click(screen.getByRole('button', { name: /continue/i }))

  // Step 3: Review
  expect(screen.getByRole('heading', { name: /review/i })).toBeInTheDocument()
  expect(screen.getByText('Alice')).toBeInTheDocument()
  expect(screen.getByText('123 Main St')).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: /place order/i }))

  // Confirmation
  expect(await screen.findByText(/order confirmed/i)).toBeInTheDocument()
})
```

### Dynamic Forms

```javascript
test('adds and removes form fields', async () => {
  const user = userEvent.setup()

  render(<DynamicForm />)

  // Initially one email field
  expect(screen.getAllByLabelText(/email/i)).toHaveLength(1)

  // Add another
  await user.click(screen.getByRole('button', { name: /add email/i }))

  expect(screen.getAllByLabelText(/email/i)).toHaveLength(2)

  // Fill both
  const [email1, email2] = screen.getAllByLabelText(/email/i)
  await user.type(email1, 'alice@example.com')
  await user.type(email2, 'bob@example.com')

  // Remove second
  const removeButtons = screen.getAllByRole('button', { name: /remove/i })
  await user.click(removeButtons[1])

  expect(screen.getAllByLabelText(/email/i)).toHaveLength(1)
})
```

## Accessibility Testing Patterns

### Keyboard Navigation

```javascript
test('navigates dropdown with keyboard', async () => {
  const user = userEvent.setup()

  render(<Dropdown options={['Red', 'Green', 'Blue']} />)

  const trigger = screen.getByRole('button', { name: /select color/i })

  // Tab to trigger
  await user.tab()
  expect(trigger).toHaveFocus()

  // Open with Enter
  await user.keyboard('{Enter}')

  const options = screen.getAllByRole('option')

  // First option focused
  expect(options[0]).toHaveFocus()

  // Navigate down
  await user.keyboard('{ArrowDown}')
  expect(options[1]).toHaveFocus()

  // Select with Enter
  await user.keyboard('{Enter}')

  expect(trigger).toHaveTextContent('Green')
})
```

### Screen Reader Support

```javascript
test('announces loading state to screen readers', async () => {
  render(<DataList />)

  // Loading state has aria-live
  const status = screen.getByRole('status')
  expect(status).toHaveTextContent('Loading data')

  // After load, status updates
  await waitFor(() => {
    expect(status).toHaveTextContent('Loaded 10 items')
  })
})

test('has descriptive labels', () => {
  render(<LoginForm />)

  // Form inputs have labels
  expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/password/i)).toBeInTheDocument()

  // Submit button has accessible name
  expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
})
```

## Anti-Patterns to Avoid

### ❌ Testing Implementation Details

```javascript
// BAD - Tests how it works, not what it does
test('sets loading state', () => {
  const wrapper = shallow(<UserList />)

  wrapper.instance().fetchUsers()

  expect(wrapper.state('isLoading')).toBe(true)
})

// GOOD - Tests what users see
test('shows loading indicator while fetching', async () => {
  render(<UserList />)

  expect(screen.getByText(/loading/i)).toBeInTheDocument()

  await waitFor(() => {
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
  })
})
```

### ❌ Snapshot Testing for Everything

```javascript
// BAD - Brittle and catches irrelevant changes
test('renders correctly', () => {
  const tree = renderer.create(<ProductCard />).toJSON()
  expect(tree).toMatchSnapshot()
})

// GOOD - Test specific behavior
test('displays product details', () => {
  const product = { name: 'Laptop', price: 999, inStock: true }

  render(<ProductCard product={product} />)

  expect(screen.getByText('Laptop')).toBeInTheDocument()
  expect(screen.getByText('$999')).toBeInTheDocument()
  expect(screen.getByText(/in stock/i)).toBeInTheDocument()
})
```

### ❌ Giant Tests

```javascript
// BAD - Tests too much, hard to debug when it fails
test('complete user journey', async () => {
  // 200 lines of interactions...
  // Signup, verify email, login, browse, add to cart, checkout, etc.
})

// GOOD - Focused tests
describe('User journey', () => {
  test('user can sign up', async () => { /* ... */ })
  test('user can verify email', async () => { /* ... */ })
  test('user can login', async () => { /* ... */ })
  test('user can browse products', async () => { /* ... */ })
})
```

### ❌ Testing CSS

```javascript
// BAD - Tests styling implementation
test('button is blue', () => {
  render(<Button />)

  const button = screen.getByRole('button')

  expect(button).toHaveStyle({ backgroundColor: 'blue' })
  expect(button).toHaveStyle({ padding: '8px 16px' })
})

// GOOD - Test visual regression with screenshots (E2E)
test('button renders correctly', async ({ page }) => {
  await page.goto('http://localhost:3000/storybook/?path=/story/button')

  await expect(page).toHaveScreenshot('button.png')
})
```

### ❌ Overusing test.only and test.skip

```javascript
// BAD - Committed to main branch
test.only('adds to cart', () => {
  // Other tests won't run!
})

test.skip('complex test', () => {
  // This test is being ignored!
})

// GOOD - Use temporarily, never commit
test('adds to cart', () => {})
test('removes from cart', () => {})
```

### ❌ Not Cleaning Up

```javascript
// BAD - Pollutes other tests
test('test 1', () => {
  localStorage.setItem('user', 'alice')
  // Doesn't clean up
})

test('test 2', () => {
  // localStorage still has 'user'!
})

// GOOD - Always clean up
afterEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})
```

## Best Practices Checklist

### Before Writing a Test

- [ ] Is this testing behavior, not implementation?
- [ ] Would a user care if this broke?
- [ ] Is this the right layer (unit/integration/E2E)?
- [ ] Can I test this at a lower level?

### While Writing a Test

- [ ] Test name describes behavior, not implementation
- [ ] Arrange-Act-Assert structure is clear
- [ ] Using the right queries (role > label > test ID)
- [ ] Waiting for async changes properly
- [ ] Not testing implementation details
- [ ] Test is focused on one behavior

### After Writing a Test

- [ ] Test fails when expected behavior breaks
- [ ] Test doesn't fail when refactoring (same behavior)
- [ ] Test is fast enough (<500ms for integration)
- [ ] Test is readable without comments
- [ ] Cleanup is handled (timers, mocks, localStorage)

## Test Smells

🚩 Test name includes "correctly", "properly", "works"
🚩 Test uses `container.querySelector()`
🚩 Test accesses component state/props directly
🚩 Test mocks internal modules
🚩 Test is over 50 lines
🚩 Test has multiple assertions checking unrelated things
🚩 Test uses `setTimeout` instead of `waitFor`
🚩 Test name doesn't explain what's being tested

## Summary

**Good Tests:**
- ✅ Test behavior, not implementation
- ✅ Are readable and maintainable
- ✅ Fail when user experience breaks
- ✅ Pass when refactoring doesn't change behavior
- ✅ Run fast
- ✅ Use appropriate testing layer

**Bad Tests:**
- ❌ Test internal state
- ❌ Break when refactoring
- ❌ Mock everything
- ❌ Take forever to run
- ❌ Are hard to understand
- ❌ Give false confidence

Write tests that make you ship with confidence, not tests that make you scared to refactor.
