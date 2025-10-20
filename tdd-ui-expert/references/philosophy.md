# Pragmatic TDD Philosophy

## Core Principle

TDD is a tool for shipping better code faster, not a religious practice. Write tests that provide value, skip tests that don't.

## When to Test

### High-Value Test Targets

**Business Logic**
- State management logic (Redux reducers, Zustand stores)
- Form validation rules
- Data transformations and calculations
- Complex conditional logic
- Authentication flows
- Payment processing
- Shopping cart logic
- Permissions and authorization

**Integration Points**
- API request handling
- External service integration
- WebSocket connections
- File uploads/downloads
- Third-party SDK integration

**User Workflows**
- Multi-step forms
- Checkout processes
- Onboarding flows
- Search and filtering
- Complex user interactions

**Accessibility Requirements**
- Keyboard navigation
- Screen reader support
- Focus management
- ARIA attributes

**Pure Functions**
- Utilities and helpers
- Date formatting
- String manipulation
- Array transformations
- Parsing and serialization

### Skip Testing

**Trivial Code**
```javascript
// Don't test this
const getFullName = (user) => `${user.firstName} ${user.lastName}`

// Or this
const getUserEmail = (user) => user.email
```

**Visual/Layout**
```javascript
// Don't test that a button is blue
expect(button).toHaveStyle({ backgroundColor: 'blue' })

// Don't test padding values
expect(container).toHaveStyle({ padding: '16px' })
```

**Third-Party Libraries**
```javascript
// Don't test that axios makes HTTP requests
// Don't test that React Router routes work
// Don't test that lodash.debounce debounces
```

**Implementation Details**
```javascript
// BAD - Testing implementation
expect(component.state.isOpen).toBe(true)

// GOOD - Testing behavior
expect(screen.getByRole('dialog')).toBeInTheDocument()
```

## The Red-Green-Refactor Cycle

### Red: Write a Failing Test

Write the simplest test that describes the next behavior you need.

```javascript
// RED - Test fails because function doesn't exist
test('calculates total price with tax', () => {
  const items = [{ price: 10 }, { price: 20 }]
  expect(calculateTotal(items, 0.08)).toBe(32.4)
})
```

### Green: Make It Pass

Write the **minimal** code to pass the test. Don't overthink it.

```javascript
// GREEN - Minimal implementation
function calculateTotal(items, taxRate) {
  const subtotal = items.reduce((sum, item) => sum + item.price, 0)
  return subtotal * (1 + taxRate)
}
```

### Refactor: Clean Up

Now improve the code without changing behavior. Tests should still pass.

```javascript
// REFACTOR - Better naming, extracted logic
function calculateTotal(items, taxRate) {
  const subtotal = calculateSubtotal(items)
  return applyTax(subtotal, taxRate)
}

function calculateSubtotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0)
}

function applyTax(amount, rate) {
  return amount * (1 + rate)
}
```

## Test Behavior, Not Implementation

### Bad: Testing Implementation

```javascript
// BAD - Breaks when you rename internal state
test('sets loading state', () => {
  const { result } = renderHook(() => useData())
  act(() => result.current.fetchData())
  expect(result.current.isLoading).toBe(true)
})
```

### Good: Testing Behavior

```javascript
// GOOD - Tests what users see
test('shows loading spinner while fetching', async () => {
  render(<DataList />)

  fireEvent.click(screen.getByText('Load Data'))

  expect(screen.getByRole('status')).toHaveTextContent('Loading...')

  await waitFor(() => {
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
```

## Document Intent with Tests

Tests are documentation that can't get out of sync with code.

```javascript
// Test name explains WHAT the code does and WHY
describe('Shopping Cart', () => {
  test('prevents checkout when cart is empty', () => {
    render(<Cart items={[]} />)

    const checkoutButton = screen.getByRole('button', { name: /checkout/i })

    expect(checkoutButton).toBeDisabled()
  })

  test('requires email for guest checkout', () => {
    render(<Checkout user={null} />)

    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    expect(screen.getByText(/email is required/i)).toBeInTheDocument()
  })

  test('applies discount code before calculating total', () => {
    const { applyDiscount, getTotal } = setupCart([{ price: 100 }])

    applyDiscount('SAVE20')

    expect(getTotal()).toBe(80)
  })
})
```

## Write Minimal Code to Pass

Don't write code you don't need yet. Let the tests drive you.

```javascript
// Start with this test
test('returns empty array for no users', () => {
  expect(filterActiveUsers([])).toEqual([])
})

// Minimal implementation
function filterActiveUsers(users) {
  return []  // Good enough!
}

// Next test
test('filters out inactive users', () => {
  const users = [
    { id: 1, active: true },
    { id: 2, active: false }
  ]
  expect(filterActiveUsers(users)).toEqual([{ id: 1, active: true }])
})

// Now implement the real logic
function filterActiveUsers(users) {
  return users.filter(user => user.active)
}
```

## Mocking Strategy

### Mock External Dependencies Aggressively

**Always mock:**
- External APIs
- Third-party services
- Databases
- File system
- Date/time (for deterministic tests)
- Random number generators

```javascript
// Mock external API with MSW
import { rest } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  rest.get('/api/users', (req, res, ctx) => {
    return res(ctx.json([{ id: 1, name: 'Alice' }]))
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

### Don't Mock Internal Modules

Testing your mocks is pointless. Test real integration.

```javascript
// BAD - Mocking your own code
jest.mock('../services/userService')

test('displays user data', async () => {
  userService.getUser.mockResolvedValue({ name: 'Alice' })
  // This tests nothing!
})

// GOOD - Mock the external API, test real integration
test('displays user data', async () => {
  // MSW intercepts HTTP request
  server.use(
    rest.get('/api/users/1', (req, res, ctx) => {
      return res(ctx.json({ name: 'Alice' }))
    })
  )

  render(<UserProfile userId={1} />)

  await waitFor(() => {
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })
})
```

## Coverage is a Guide, Not a Goal

### Don't Chase 100% Coverage

```javascript
// This is 100% coverage but worthless
test('getUserName returns user.name', () => {
  expect(getUserName({ name: 'Alice' })).toBe('Alice')
})

// This is 80% coverage but valuable
test('checkout flow handles payment failures', async () => {
  server.use(
    rest.post('/api/payments', (req, res, ctx) => {
      return res(ctx.status(402), ctx.json({ error: 'Card declined' }))
    })
  )

  render(<Checkout />)
  await fillOutPaymentForm()

  fireEvent.click(screen.getByRole('button', { name: /pay/i }))

  await waitFor(() => {
    expect(screen.getByText(/card declined/i)).toBeInTheDocument()
  })
})
```

### Aim for High-Value Coverage

- 100% coverage of business logic
- 80%+ coverage of components
- Critical paths fully tested
- Edge cases covered
- Error handling tested

### Ignore Low-Value Coverage

- CSS classes
- Prop types (TypeScript handles this)
- Trivial getters/setters
- Constants
- Type definitions

## Speed Matters

### Fast Tests = Fast Feedback

**Optimize for speed:**
- Unit tests: < 100ms each
- Integration tests: < 500ms each
- E2E tests: < 5 seconds each

**Slow tests kill TDD.**

```javascript
// FAST - Pure function test
test('formats currency', () => {
  expect(formatCurrency(1234.56)).toBe('$1,234.56')
}) // ~1ms

// FAST - Component test with RTL
test('renders user name', () => {
  render(<UserCard name="Alice" />)
  expect(screen.getByText('Alice')).toBeInTheDocument()
}) // ~50ms

// SLOW - E2E test
test('completes checkout flow', async () => {
  await page.goto('http://localhost:3000')
  await page.click('text=Add to Cart')
  await page.click('text=Checkout')
  await page.fill('[name=email]', 'test@example.com')
  // ... more steps
}) // ~3 seconds
```

### Run Tests in Parallel

```javascript
// jest.config.js
module.exports = {
  maxWorkers: '50%',  // Use half your CPU cores
  testTimeout: 5000,  // Fail slow tests
}
```

## When Tests Break

### Good Test Failures

Test breaks because:
- User behavior changed
- Business logic changed
- API contract changed
- Security requirement added

**These are valuable failures.** Update the test.

### Bad Test Failures

Test breaks because:
- Renamed a function
- Moved a component
- Changed CSS class names
- Refactored internal state

**These are brittle tests.** Rewrite them to test behavior.

## Pragmatic Principles Summary

1. **Test what matters**: Business logic, integration points, user workflows
2. **Skip what doesn't**: Trivial code, visual tweaks, third-party libraries
3. **Behavior over implementation**: Test what users see, not how it works
4. **Mock externally, integrate internally**: Mock APIs, don't mock your code
5. **Speed is a feature**: Fast tests = fast iteration
6. **Coverage guides, doesn't dictate**: Focus on high-value tests
7. **Ship iteratively**: Working, tested code today > perfect code tomorrow

## The Line: What Gets Tested

| ✅ Test This | ❌ Skip This |
|-------------|-------------|
| Form validation | Button colors |
| Authentication | Padding values |
| API handling | CSS classes |
| State management | Obvious layouts |
| User workflows | Third-party wrappers |
| Error handling | Trivial getters |
| Business logic | Implementation details |
| Accessibility | Constants |
| Data transformations | Type definitions |

Remember: TDD is a tool for shipping better code faster. Use it pragmatically.
