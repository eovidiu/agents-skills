import { renderHook, waitFor, act } from '@testing-library/react'
import { useCustomHook } from './useCustomHook'

describe('useCustomHook', () => {
  test('initializes with default values', () => {
    const { result } = renderHook(() => useCustomHook())

    expect(result.current.value).toBe(null)
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe(null)
  })

  test('fetches data on mount', async () => {
    const { result } = renderHook(() => useCustomHook('/api/data'))

    // Initial loading state
    expect(result.current.loading).toBe(true)

    // Wait for data
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.value).toBeDefined()
    expect(result.current.error).toBe(null)
  })

  test('refetches data when called', async () => {
    const { result } = renderHook(() => useCustomHook('/api/data'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    const initialValue = result.current.value

    // Trigger refetch
    act(() => {
      result.current.refetch()
    })

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.value).toBeDefined()
  })

  test('handles errors', async () => {
    // Mock API error here

    const { result } = renderHook(() => useCustomHook('/api/error'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBeDefined()
    expect(result.current.value).toBe(null)
  })

  test('updates when dependencies change', async () => {
    const { result, rerender } = renderHook(
      ({ id }) => useCustomHook(`/api/data/${id}`),
      { initialProps: { id: 1 } }
    )

    await waitFor(() => expect(result.current.loading).toBe(false))

    // Change dependency
    rerender({ id: 2 })

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
  })
})
