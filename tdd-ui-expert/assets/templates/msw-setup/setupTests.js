import '@testing-library/jest-dom'
import { server } from './mocks/server'

// Establish API mocking before all tests
beforeAll(() => server.listen({
  onUnhandledRequest: 'warn'
}))

// Reset handlers after each test
afterEach(() => server.resetHandlers())

// Clean up after all tests
afterAll(() => server.close())

// Global cleanup
afterEach(() => {
  // Clean up localStorage
  localStorage.clear()

  // Clean up sessionStorage
  sessionStorage.clear()

  // Reset any fake timers
  if (global.setTimeout.clock) {
    jest.useRealTimers()
  }
})
