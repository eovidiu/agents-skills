# Frontend Testing Pyramid

## The Frontend Testing Pyramid

```
        /\
       /  \      E2E Tests (5-10%)
      /    \     - Full user flows
     /______\    - Critical paths only
    /        \
   /          \  Integration Tests (60-70%)
  /            \ - Component + real dependencies
 /              \- User interactions
/______________\
                 Unit Tests (20-30%)
                 - Pure functions
                 - Business logic
```

**Focus on integration tests** for frontend. This is where the value is.

## Unit Tests (20-30%)

### What to Unit Test

**Pure Functions**
```javascript
// utils/currency.js
export function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount)
}

// utils/currency.test.js
describe('formatCurrency', () => {
  test('formats USD correctly', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56')
  })

  test('handles negative amounts', () => {
    expect(formatCurrency(-100)).toBe('-$100.00')
  })

  test('supports different currencies', () => {
    expect(formatCurrency(1000, 'EUR')).toBe('€1,000.00')
  })
})
```

**Business Logic**
```javascript
// lib/cart.js
export function calculateDiscount(items, discountCode) {
  const subtotal = items.reduce((sum, item) => sum + item.price, 0)

  if (discountCode === 'SAVE20') {
    return subtotal * 0.2
  }

  if (discountCode === 'SAVE50' && subtotal > 100) {
    return subtotal * 0.5
  }

  return 0
}

// lib/cart.test.js
describe('calculateDiscount', () => {
  test('applies 20% discount with SAVE20', () => {
    const items = [{ price: 100 }]
    expect(calculateDiscount(items, 'SAVE20')).toBe(20)
  })

  test('applies 50% discount with SAVE50 for orders over $100', () => {
    const items = [{ price: 150 }]
    expect(calculateDiscount(items, 'SAVE50')).toBe(75)
  })

  test('does not apply SAVE50 for orders under $100', () => {
    const items = [{ price: 50 }]
    expect(calculateDiscount(items, 'SAVE50')).toBe(0)
  })
})
```

**Validators**
```javascript
// lib/validators.js
export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

export function validatePassword(password) {
  return {
    valid: password.length >= 8,
    errors: {
      length: password.length < 8,
      uppercase: !/[A-Z]/.test(password),
      number: !/\d/.test(password)
    }
  }
}

// lib/validators.test.js
describe('validateEmail', () => {
  test('accepts valid emails', () => {
    expect(validateEmail('alice@example.com')).toBe(true)
  })

  test('rejects invalid emails', () => {
    expect(validateEmail('not-an-email')).toBe(false)
    expect(validateEmail('@example.com')).toBe(false)
  })
})

describe('validatePassword', () => {
  test('validates strong password', () => {
    const result = validatePassword('Password123')
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual({
      length: false,
      uppercase: false,
      number: false
    })
  })

  test('rejects weak password', () => {
    const result = validatePassword('weak')
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBe(true)
  })
})
```

### What NOT to Unit Test

❌ Component rendering (use integration tests)
❌ React hooks in isolation (test through components)
❌ Third-party libraries
❌ Constants and configuration
❌ Type definitions

## Integration Tests (60-70%)

**This is your sweet spot for frontend testing.**

### What to Integration Test

**Component + User Interactions**
```javascript
test('filters products by category', async () => {
  const user = userEvent.setup()

  render(<ProductList />)

  // Initially shows all products
  expect(screen.getAllByRole('article')).toHaveLength(10)

  // Filter by category
  await user.click(screen.getByRole('button', { name: /electronics/i }))

  // Shows only electronics
  await waitFor(() => {
    expect(screen.getAllByRole('article')).toHaveLength(3)
  })

  expect(screen.getByText('Laptop')).toBeInTheDocument()
  expect(screen.queryByText('Shoes')).not.toBeInTheDocument()
})
```

**Forms with Validation**
```javascript
test('validates and submits contact form', async () => {
  const user = userEvent.setup()
  const handleSubmit = jest.fn()

  render(<ContactForm onSubmit={handleSubmit} />)

  // Submit empty form
  await user.click(screen.getByRole('button', { name: /send/i }))

  // Shows validation errors
  expect(screen.getByText(/name is required/i)).toBeInTheDocument()
  expect(screen.getByText(/email is required/i)).toBeInTheDocument()

  // Fill out form
  await user.type(screen.getByLabelText(/name/i), 'Alice')
  await user.type(screen.getByLabelText(/email/i), 'alice@example.com')
  await user.type(screen.getByLabelText(/message/i), 'Hello!')

  // Submit valid form
  await user.click(screen.getByRole('button', { name: /send/i }))

  expect(handleSubmit).toHaveBeenCalledWith({
    name: 'Alice',
    email: 'alice@example.com',
    message: 'Hello!'
  })
})
```

**API Integration**
```javascript
test('loads and displays user profile', async () => {
  server.use(
    rest.get('/api/users/1', (req, res, ctx) => {
      return res(
        ctx.json({
          id: 1,
          name: 'Alice',
          email: 'alice@example.com',
          bio: 'Software Engineer'
        })
      )
    })
  )

  render(<UserProfile userId={1} />)

  // Shows loading state
  expect(screen.getByText(/loading/i)).toBeInTheDocument()

  // Shows user data
  expect(await screen.findByText('Alice')).toBeInTheDocument()
  expect(screen.getByText('alice@example.com')).toBeInTheDocument()
  expect(screen.getByText('Software Engineer')).toBeInTheDocument()

  // Loading state gone
  expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
})
```

**State Management**
```javascript
test('shopping cart updates across components', async () => {
  const user = userEvent.setup()

  render(
    <CartProvider>
      <ProductList />
      <Cart />
    </CartProvider>
  )

  // Cart initially empty
  expect(screen.getByText(/cart: 0 items/i)).toBeInTheDocument()

  // Add item to cart
  await user.click(screen.getByRole('button', { name: /add laptop/i }))

  // Cart updates
  expect(screen.getByText(/cart: 1 item/i)).toBeInTheDocument()
  expect(screen.getByText('Laptop')).toBeInTheDocument()

  // Remove item
  await user.click(screen.getByRole('button', { name: /remove/i }))

  // Cart empty again
  expect(screen.getByText(/cart: 0 items/i)).toBeInTheDocument()
})
```

**Error States**
```javascript
test('handles API errors gracefully', async () => {
  server.use(
    rest.get('/api/products', (req, res, ctx) => {
      return res(
        ctx.status(500),
        ctx.json({ error: 'Server error' })
      )
    })
  )

  render(<ProductList />)

  // Shows error message
  expect(await screen.findByText(/failed to load products/i)).toBeInTheDocument()

  // Shows retry button
  const retryButton = screen.getByRole('button', { name: /retry/i })
  expect(retryButton).toBeInTheDocument()

  // Retry works
  server.use(
    rest.get('/api/products', (req, res, ctx) => {
      return res(ctx.json([{ id: 1, name: 'Laptop' }]))
    })
  )

  await userEvent.click(retryButton)

  expect(await screen.findByText('Laptop')).toBeInTheDocument()
})
```

**Authentication Flows**
```javascript
test('login flow redirects to dashboard', async () => {
  const user = userEvent.setup()

  server.use(
    rest.post('/api/auth/login', (req, res, ctx) => {
      return res(
        ctx.json({
          token: 'fake-token',
          user: { id: 1, name: 'Alice' }
        })
      )
    }),

    rest.get('/api/profile', (req, res, ctx) => {
      return res(ctx.json({ name: 'Alice', role: 'admin' }))
    })
  )

  render(<App />)

  // Fill login form
  await user.type(screen.getByLabelText(/email/i), 'alice@example.com')
  await user.type(screen.getByLabelText(/password/i), 'password123')
  await user.click(screen.getByRole('button', { name: /login/i }))

  // Redirected to dashboard
  expect(await screen.findByRole('heading', { name: /dashboard/i })).toBeInTheDocument()
  expect(screen.getByText(/welcome, alice/i)).toBeInTheDocument()
})
```

### Integration Test Characteristics

✅ Test multiple components together
✅ Include real state management
✅ Use MSW for API calls
✅ Test user interactions
✅ Cover happy path AND error states
✅ Verify loading states
✅ Test full workflows

## E2E Tests (5-10%)

### What to E2E Test

**Critical User Journeys**
- Sign up → Verify email → Login
- Browse products → Add to cart → Checkout → Payment
- Create content → Edit → Publish
- Onboarding flow

**Multi-Page Workflows**
```javascript
// tests/e2e/checkout.spec.js
import { test, expect } from '@playwright/test'

test('complete checkout flow', async ({ page }) => {
  // Browse products
  await page.goto('http://localhost:3000')

  // Add to cart
  await page.click('text=Laptop')
  await page.click('button:has-text("Add to Cart")')

  // Go to cart
  await page.click('a:has-text("Cart")')
  await expect(page.locator('text=Laptop')).toBeVisible()

  // Checkout
  await page.click('button:has-text("Checkout")')

  // Fill shipping
  await page.fill('[name=name]', 'Alice')
  await page.fill('[name=address]', '123 Main St')
  await page.fill('[name=city]', 'Portland')
  await page.click('button:has-text("Continue")')

  // Fill payment
  await page.fill('[name=cardNumber]', '4242424242424242')
  await page.fill('[name=expiry]', '12/25')
  await page.fill('[name=cvc]', '123')
  await page.click('button:has-text("Pay")')

  // Order confirmation
  await expect(page.locator('text=Order Confirmed')).toBeVisible()
  await expect(page.locator('text=Order #')).toBeVisible()
})
```

**Cross-Browser Testing**
```javascript
test.describe('authentication', () => {
  test.use({ browserName: 'chromium' })

  test('login works in Chrome', async ({ page }) => {
    await page.goto('http://localhost:3000/login')
    // ...
  })
})

test.describe('authentication', () => {
  test.use({ browserName: 'firefox' })

  test('login works in Firefox', async ({ page }) => {
    await page.goto('http://localhost:3000/login')
    // ...
  })
})
```

**Visual Regression**
```javascript
test('homepage looks correct', async ({ page }) => {
  await page.goto('http://localhost:3000')

  await expect(page).toHaveScreenshot('homepage.png')
})
```

### E2E Test Characteristics

✅ Test across multiple pages
✅ Real browser environment
✅ Complete user journeys
✅ Critical business paths only
✅ Test payment flows
✅ Test authentication
✅ Keep count low (slow and brittle)

### When to Skip E2E

❌ Testing individual components
❌ Testing API integrations (use MSW in integration tests)
❌ Testing every feature variation
❌ Testing CSS and styling
❌ Fast feedback loops (E2E is slow)

## Testing Strategy Decision Tree

```
Is it a pure function?
├─ YES → Unit test
└─ NO ↓

Does it involve user interaction with components?
├─ YES → Integration test (RTL + MSW)
└─ NO ↓

Does it span multiple pages/critical business flow?
├─ YES → E2E test (Playwright/Cypress)
└─ NO → Probably don't test it
```

## Practical Distribution Example

For a typical e-commerce app:

### Unit Tests (25%)
- `formatCurrency()` - 3 tests
- `calculateShipping()` - 5 tests
- `validateCreditCard()` - 4 tests
- `parseAddress()` - 3 tests
- **Total: 15 tests** (~50ms total)

### Integration Tests (70%)
- Product listing with filters - 8 tests
- Shopping cart operations - 10 tests
- Checkout form validation - 12 tests
- User profile management - 8 tests
- Search functionality - 6 tests
- **Total: 44 tests** (~10 seconds total)

### E2E Tests (5%)
- Complete checkout flow - 1 test
- User registration + verification - 1 test
- Password reset flow - 1 test
- **Total: 3 tests** (~30 seconds total)

**Total: 62 tests in ~40 seconds**

## Best Practices by Layer

### Unit Tests
✅ Fast (<100ms each)
✅ No dependencies
✅ Test edge cases
✅ 100% coverage of business logic

### Integration Tests
✅ Test user behavior
✅ Use real components
✅ Mock external APIs with MSW
✅ Don't mock internal modules
✅ Cover happy path + errors

### E2E Tests
✅ Critical paths only
✅ Test in production-like environment
✅ Keep count low (<10)
✅ Run in CI before deployment
✅ Monitor and fix flakiness

## Common Mistakes

### ❌ Too Many Unit Tests

```javascript
// BAD - Over-testing implementation
test('useState initializes with empty string', () => {
  const { result } = renderHook(() => useState(''))
  expect(result.current[0]).toBe('')
})

test('useState updates value', () => {
  const { result } = renderHook(() => useState(''))
  act(() => result.current[1]('hello'))
  expect(result.current[0]).toBe('hello')
})
```

### ❌ Too Many E2E Tests

```javascript
// BAD - E2E for simple interaction
test('button changes color on hover', async ({ page }) => {
  await page.goto('http://localhost:3000')
  await page.hover('button')
  const color = await page.$eval('button', el =>
    window.getComputedStyle(el).backgroundColor
  )
  expect(color).toBe('rgb(0, 0, 255)')
})

// GOOD - Use integration test instead
test('button is accessible and clickable', async () => {
  const user = userEvent.setup()
  const handleClick = jest.fn()

  render(<Button onClick={handleClick}>Click me</Button>)

  await user.click(screen.getByRole('button'))
  expect(handleClick).toHaveBeenCalled()
})
```

### ❌ Testing Implementation Details

```javascript
// BAD
expect(component.state.count).toBe(5)

// GOOD
expect(screen.getByText('Count: 5')).toBeInTheDocument()
```

## Speed Optimization

### Run Tests in Parallel

```javascript
// jest.config.js
module.exports = {
  maxWorkers: '50%',
  testTimeout: 5000
}
```

### Group Related Tests

```javascript
// Run fast tests first
describe('Unit tests', () => {
  // Pure functions
})

describe('Integration tests', () => {
  // Components + APIs
})

describe.skip('E2E tests', () => {
  // Skip in watch mode
})
```

### Use Test Tags

```javascript
// Run only smoke tests in PR
test.concurrent('loads homepage', () => {
  // @smoke
})

// Run full suite in CI
test('complete checkout flow', () => {
  // @e2e @slow
})
```

## Summary

**Frontend Testing Pyramid:**
- **70% Integration** - Components + user interactions + real APIs (mocked)
- **25% Unit** - Pure functions + business logic
- **5% E2E** - Critical flows across pages

**Focus on integration tests.** They give you the most confidence with reasonable speed.

**Ship fast, test smart.**
