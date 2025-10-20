---
name: tdd-ui-expert
description: Pragmatic Test-Driven Development skill for frontend engineers building React applications. Focus on shipping better code faster through behavioral testing, not dogma. Covers React Testing Library, MSW for API mocking, integration-first testing strategy, and avoiding common anti-patterns. Use when writing tests before implementation, testing components, forms, API integrations, hooks, or setting up testing infrastructure. Emphasizes testing what matters and skipping what doesn't.
---

# Pragmatic TDD for Frontend

## Overview

Pragmatic TDD Expert provides senior-level guidance for frontend engineers who write tests before implementation—not because it's dogma, but because it genuinely ships better code faster. This skill focuses on behavior-driven testing using React Testing Library, realistic API mocking with MSW, and an integration-first approach that maximizes confidence while minimizing brittleness.

Use this skill when building or testing React applications with TDD, setting up testing infrastructure, reviewing code for test quality, or needing guidance on what to test (and what to skip).

## Core Philosophy

### Test to Ship Fast, Not to Reach 100%

Write tests that provide value. Skip tests that don't.

**Test what matters:**
- Business logic that's fragile
- Integration points where things go wrong
- Pure functions and utilities
- Form validation and user workflows
- Authentication flows and state management
- Accessibility requirements

**Skip what doesn't:**
- CSS tweaks and padding values
- Trivial getters and obvious layouts
- Third-party library wrappers
- Implementation details
- Button colors and styling

**Reference**: `references/philosophy.md` - Complete pragmatic TDD philosophy, when to test vs. skip, Red-Green-Refactor cycle, and coverage strategies.

### The Frontend Testing Pyramid

```
     /\
    /  \     E2E (5-10%) - Critical flows only
   /____\
  /      \   Integration (60-70%) - Your sweet spot
 /        \  Component + user interactions + APIs
/__________\
             Unit (20-30%) - Pure functions + logic
```

**Focus on integration tests.** This is where frontend value lives.

**Reference**: `references/testing-pyramid.md` - Detailed breakdown of unit vs integration vs E2E, when to use each layer, and practical distribution examples.

## The TDD Cycle

### Red → Green → Refactor

**1. RED: Write a Failing Test**

```javascript
test('calculates total with tax', () => {
  const items = [{ price: 100 }]
  expect(calculateTotal(items, 0.08)).toBe(108)
})
// ❌ FAIL - function doesn't exist
```

**2. GREEN: Make It Pass (Minimal Code)**

```javascript
function calculateTotal(items, taxRate) {
  const subtotal = items.reduce((sum, item) => sum + item.price, 0)
  return subtotal * (1 + taxRate)
}
// ✅ PASS
```

**3. REFACTOR: Clean Up (Tests Still Pass)**

```javascript
function calculateTotal(items, taxRate) {
  const subtotal = calculateSubtotal(items)
  return applyTax(subtotal, taxRate)
}
// ✅ PASS - better code, same behavior
```

## Quick Start

### 1. Set Up Testing Infrastructure

Use the setup script to install dependencies:

```bash
# From your project root
bash scripts/setup-testing.sh
```

This installs:
- React Testing Library
- Vitest (or Jest)
- MSW for API mocking
- User Event for realistic interactions

### 2. Configure Vitest

Copy the configuration template:

```bash
# Use template
cp assets/templates/vitest.config.js ./vitest.config.js
```

### 3. Set Up MSW

Create MSW server for API mocking:

```bash
# Copy MSW setup files
cp -r assets/templates/msw-setup/server.js src/mocks/
cp -r assets/templates/msw-setup/handlers.js src/mocks/
cp assets/templates/msw-setup/setupTests.js src/
```

### 4. Create Custom Test Utils

```bash
cp assets/templates/test-utils.js src/
```

Now import from your custom utils:

```javascript
import { render, screen } from './test-utils' // Not @testing-library/react
```

### 5. Start Testing!

Use templates for common patterns:
- `assets/templates/component.test.js` - Basic component testing
- `assets/templates/form.test.js` - Form validation and submission
- `assets/templates/api-integration.test.js` - API calls with MSW
- `assets/templates/hook.test.js` - Custom hooks

## When to Use This Skill

Trigger this skill when:
- Writing tests before implementation (TDD)
- Testing React components and user interactions
- Setting up API mocking with MSW
- Testing forms, validation, and submissions
- Writing tests for custom hooks
- Testing authentication flows
- Reviewing code for test quality
- Deciding what to test vs. skip
- Optimizing test speed and reliability
- Debugging flaky tests

## Testing Patterns by Use Case

### 1. Component Testing

Test user behavior, not implementation.

```javascript
import { render, screen } from './test-utils'
import userEvent from '@testing-library/user-event'

test('toggles accordion on click', async () => {
  const user = userEvent.setup()
  render(<Accordion title="Details">Content</Accordion>)

  // Initially closed
  expect(screen.queryByText('Content')).not.toBeInTheDocument()

  // Click to open
  await user.click(screen.getByRole('button', { name: /details/i }))

  expect(screen.getByText('Content')).toBeInTheDocument()
})
```

**Reference**: `references/react-testing.md` - Complete React Testing Library guide with query priorities, async patterns, hooks testing, accessibility, and anti-patterns.

**Template**: `assets/templates/component.test.js`

### 2. Form Testing

Validate, submit, handle errors.

```javascript
test('validates and submits form', async () => {
  const user = userEvent.setup()
  const handleSubmit = jest.fn()

  render(<ContactForm onSubmit={handleSubmit} />)

  // Submit empty - validation errors
  await user.click(screen.getByRole('button', { name: /submit/i }))
  expect(screen.getByText(/email is required/i)).toBeInTheDocument()

  // Fill valid data
  await user.type(screen.getByLabelText(/email/i), 'alice@example.com')
  await user.click(screen.getByRole('button', { name: /submit/i }))

  expect(handleSubmit).toHaveBeenCalledWith({
    email: 'alice@example.com'
  })
})
```

**Template**: `assets/templates/form.test.js`

### 3. API Integration with MSW

Mock external APIs, test real integration.

```javascript
import { rest } from 'msw'
import { server } from './mocks/server'

test('loads and displays users', async () => {
  server.use(
    rest.get('/api/users', (req, res, ctx) => {
      return res(
        ctx.json([
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' }
        ])
      )
    })
  )

  render(<UserList />)

  expect(await screen.findByText('Alice')).toBeInTheDocument()
  expect(screen.getByText('Bob')).toBeInTheDocument()
})
```

**Reference**: `references/api-mocking.md` - Complete MSW guide with error handling, GraphQL support, authentication flows, file uploads, and stateful mocks.

**Templates**:
- `assets/templates/api-integration.test.js`
- `assets/templates/msw-setup/*`

### 4. Custom Hooks

Test hooks through behavior, not internals.

```javascript
import { renderHook, waitFor } from '@testing-library/react'

test('fetches data on mount', async () => {
  const { result } = renderHook(() => useData('/api/users'))

  expect(result.current.loading).toBe(true)

  await waitFor(() => {
    expect(result.current.loading).toBe(false)
  })

  expect(result.current.data).toBeDefined()
})
```

**Template**: `assets/templates/hook.test.js`

### 5. Authentication Flows

Test login, token handling, protected routes.

```javascript
test('login flow redirects to dashboard', async () => {
  const user = userEvent.setup()

  server.use(
    rest.post('/api/auth/login', (req, res, ctx) => {
      return res(
        ctx.json({
          token: 'fake-token',
          user: { name: 'Alice' }
        })
      )
    })
  )

  render(<App />)

  await user.type(screen.getByLabelText(/email/i), 'alice@example.com')
  await user.type(screen.getByLabelText(/password/i), 'password123')
  await user.click(screen.getByRole('button', { name: /login/i }))

  expect(await screen.findByText(/welcome, alice/i)).toBeInTheDocument()
})
```

## Key Principles

### 1. Test Behavior, Not Implementation

```javascript
// ❌ BAD - Tests internal state
expect(component.state.isOpen).toBe(true)

// ✅ GOOD - Tests what users see
expect(screen.getByRole('dialog')).toBeInTheDocument()
```

### 2. Mock Externally, Integrate Internally

```javascript
// ✅ Mock external API with MSW
server.use(
  rest.get('/api/users', (req, res, ctx) => {
    return res(ctx.json([{ id: 1, name: 'Alice' }]))
  })
)

// ❌ Don't mock your own components/services
jest.mock('../services/userService') // Avoid this!
```

### 3. Query by Role/Label, Not Test IDs

```javascript
// ✅ BEST - Accessible queries
screen.getByRole('button', { name: /submit/i })
screen.getByLabelText(/email/i)

// ⚠️ OK - Semantic
screen.getByPlaceholderText('Enter email')

// ❌ AVOID - Implementation detail
screen.getByTestId('submit-button')
```

### 4. Use userEvent, Not fireEvent

```javascript
// ✅ GOOD - Realistic user interaction
await userEvent.click(button)
await userEvent.type(input, 'hello')

// ❌ BAD - Low-level event firing
fireEvent.click(button)
fireEvent.change(input, { target: { value: 'hello' } })
```

### 5. Write Minimal Code to Pass

Don't write code you don't need yet. Let tests drive you.

```javascript
// First test
test('returns empty array for no users', () => {
  expect(filterActiveUsers([])).toEqual([])
})

// Minimal implementation
function filterActiveUsers(users) {
  return []  // Good enough!
}

// Next test drives real logic
test('filters inactive users', () => {
  const users = [
    { id: 1, active: true },
    { id: 2, active: false }
  ]
  expect(filterActiveUsers(users)).toEqual([{ id: 1, active: true }])
})

// Now implement filtering
function filterActiveUsers(users) {
  return users.filter(user => user.active)
}
```

## Anti-Patterns to Avoid

### ❌ Testing Implementation Details

```javascript
// BAD
wrapper.find('.error-message').exists()
component.state.hasError === true

// GOOD
screen.getByText(/error occurred/i)
```

### ❌ Snapshot Testing Everything

```javascript
// BAD - Brittle, catches irrelevant changes
expect(tree).toMatchSnapshot()

// GOOD - Test specific behavior
expect(screen.getByText('Laptop')).toBeInTheDocument()
expect(screen.getByText('$999')).toBeInTheDocument()
```

### ❌ Giant Tests

```javascript
// BAD - 200 lines testing everything
test('complete user journey', () => { /* ... */ })

// GOOD - Focused tests
test('user can login', () => {})
test('user can browse products', () => {})
test('user can checkout', () => {})
```

### ❌ Testing CSS

```javascript
// BAD
expect(button).toHaveStyle({ backgroundColor: 'blue' })

// GOOD - Use E2E visual regression instead
await expect(page).toHaveScreenshot('button.png')
```

**Reference**: `references/patterns.md` - Comprehensive patterns and anti-patterns guide with AAA pattern, test helpers, mocking strategies, async patterns, and best practices checklist.

## Speed Matters

Fast tests = fast feedback = fast iteration.

**Optimize for speed:**
- Unit tests: <100ms each
- Integration tests: <500ms each
- E2E tests: <5 seconds each

**Run in parallel:**

```javascript
// jest.config.js or vitest.config.js
{
  maxWorkers: '50%',  // Use half CPU cores
  testTimeout: 5000   // Fail slow tests
}
```

## Resources

### references/
Comprehensive documentation loaded as needed:

- `philosophy.md` - When to test, what to skip, Red-Green-Refactor, coverage strategies
- `react-testing.md` - React Testing Library best practices, queries, async patterns
- `api-mocking.md` - MSW setup, error handling, authentication, GraphQL
- `testing-pyramid.md` - Unit vs integration vs E2E distribution and examples
- `patterns.md` - Common patterns, anti-patterns, best practices checklist

### scripts/
Setup utilities:

- `setup-testing.sh` - Install all testing dependencies (RTL, Vitest, MSW)

### assets/templates/
Copy-paste templates for common scenarios:

- `component.test.js` - Basic component testing template
- `form.test.js` - Form validation and submission template
- `api-integration.test.js` - API integration with MSW template
- `hook.test.js` - Custom hooks testing template
- `test-utils.js` - Custom render with providers
- `vitest.config.js` - Vitest configuration
- `msw-setup/` - Complete MSW setup (server, handlers, setupTests)

## Decision Tree: What to Test

```
Is it a pure function?
├─ YES → Unit test
└─ NO ↓

Does it involve user interaction with components?
├─ YES → Integration test (RTL + MSW)
└─ NO ↓

Does it span multiple pages / critical business flow?
├─ YES → E2E test (Playwright/Cypress)
└─ NO → Probably don't test it
```

## Getting Help

For specific topics:

- **Philosophy**: When to test vs. skip → `references/philosophy.md`
- **React components**: RTL patterns → `references/react-testing.md`
- **API mocking**: MSW setup → `references/api-mocking.md`
- **Test strategy**: Unit vs integration vs E2E → `references/testing-pyramid.md`
- **Common patterns**: Best practices → `references/patterns.md`
- **Setup project**: Run `scripts/setup-testing.sh`
- **Templates**: Copy from `assets/templates/`

## Summary

**TDD is a tool for shipping better code faster.**

- **70% integration tests** - Components + user interactions + real APIs (mocked with MSW)
- **25% unit tests** - Pure functions + business logic
- **5% E2E tests** - Critical flows across pages

**Test behavior, not implementation.**
**Mock externally, integrate internally.**
**Speed is a feature.**

Write tests that make you ship with confidence, not tests that make you scared to refactor.
