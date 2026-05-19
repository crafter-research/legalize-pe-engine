import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { checkRateLimit } from './rate-limit'

describe('Rate Limiting', () => {
  beforeEach(() => {
    // Use fake timers to control time in tests
    vi.useFakeTimers()
  })

  afterEach(() => {
    // Restore real timers after each test
    vi.useRealTimers()
  })

  it('should allow first request from new IP', () => {
    const result = checkRateLimit('192.168.1.1')
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(99)
    expect(result.resetTime).toBeGreaterThan(Date.now())
  })

  it('should track multiple requests from same IP', () => {
    const ip = '192.168.1.2'

    // First request
    const result1 = checkRateLimit(ip)
    expect(result1.allowed).toBe(true)
    expect(result1.remaining).toBe(99)

    // Second request
    const result2 = checkRateLimit(ip)
    expect(result2.allowed).toBe(true)
    expect(result2.remaining).toBe(98)

    // Third request
    const result3 = checkRateLimit(ip)
    expect(result3.allowed).toBe(true)
    expect(result3.remaining).toBe(97)
  })

  it('should block requests after limit is exceeded', () => {
    const ip = '192.168.1.3'

    // Make 100 requests (the limit)
    for (let i = 0; i < 100; i++) {
      const result = checkRateLimit(ip)
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(99 - i)
    }

    // 101st request should be blocked
    const blockedResult = checkRateLimit(ip)
    expect(blockedResult.allowed).toBe(false)
    expect(blockedResult.remaining).toBe(0)

    // 102nd request should also be blocked
    const blockedResult2 = checkRateLimit(ip)
    expect(blockedResult2.allowed).toBe(false)
    expect(blockedResult2.remaining).toBe(0)
  })

  it('should reset counter after time window expires', () => {
    const ip = '192.168.1.4'

    // First request
    const result1 = checkRateLimit(ip)
    expect(result1.allowed).toBe(true)
    expect(result1.remaining).toBe(99)
    const resetTime1 = result1.resetTime

    // Make a few more requests
    checkRateLimit(ip)
    checkRateLimit(ip)
    const result4 = checkRateLimit(ip)
    expect(result4.remaining).toBe(96)

    // Advance time past the reset window (60 seconds)
    vi.advanceTimersByTime(61 * 1000)

    // Next request should reset the counter
    const result5 = checkRateLimit(ip)
    expect(result5.allowed).toBe(true)
    expect(result5.remaining).toBe(99)
    expect(result5.resetTime).toBeGreaterThan(resetTime1)
  })

  it('should track different IPs independently', () => {
    const ip1 = '192.168.1.5'
    const ip2 = '192.168.1.6'

    // Make requests from ip1
    checkRateLimit(ip1)
    checkRateLimit(ip1)
    const result1 = checkRateLimit(ip1)
    expect(result1.remaining).toBe(97)

    // Make requests from ip2
    const result2 = checkRateLimit(ip2)
    expect(result2.remaining).toBe(99) // ip2 should have its own counter

    // Make more requests from ip1
    const result3 = checkRateLimit(ip1)
    expect(result3.remaining).toBe(96)

    // ip2 should still be at 99
    const result4 = checkRateLimit(ip2)
    expect(result4.remaining).toBe(98)
  })

  it('should return correct reset time', () => {
    const ip = '192.168.1.7'
    const beforeTime = Date.now()

    const result = checkRateLimit(ip)
    const afterTime = Date.now()

    expect(result.resetTime).toBeGreaterThanOrEqual(beforeTime + 60 * 1000)
    expect(result.resetTime).toBeLessThanOrEqual(afterTime + 60 * 1000)
  })

  it('should maintain same reset time for subsequent requests in same window', () => {
    const ip = '192.168.1.8'

    const result1 = checkRateLimit(ip)
    const resetTime1 = result1.resetTime

    // Wait a bit but not past the window
    vi.advanceTimersByTime(10 * 1000)

    const result2 = checkRateLimit(ip)
    const resetTime2 = result2.resetTime

    // Reset time should be the same
    expect(resetTime2).toBe(resetTime1)
  })

  it('should handle rapid successive requests', () => {
    const ip = '192.168.1.9'

    // Make 50 rapid requests
    const results = []
    for (let i = 0; i < 50; i++) {
      results.push(checkRateLimit(ip))
    }

    // All should be allowed
    expect(results.every((r) => r.allowed)).toBe(true)

    // Remaining should decrease properly
    expect(results[0].remaining).toBe(99)
    expect(results[49].remaining).toBe(50)
  })

  it('should handle requests right at the limit', () => {
    const ip = '192.168.1.10'

    // Make exactly 100 requests
    let lastResult = checkRateLimit(ip)
    for (let i = 1; i < 100; i++) {
      lastResult = checkRateLimit(ip)
    }

    expect(lastResult.allowed).toBe(true)
    expect(lastResult.remaining).toBe(0)

    // Next request should be blocked
    const blockedResult = checkRateLimit(ip)
    expect(blockedResult.allowed).toBe(false)
    expect(blockedResult.remaining).toBe(0)
  })

  it('should allow requests again after reset', () => {
    const ip = '192.168.1.11'

    // Exhaust the limit
    for (let i = 0; i < 100; i++) {
      checkRateLimit(ip)
    }

    // Verify blocked
    const blockedResult = checkRateLimit(ip)
    expect(blockedResult.allowed).toBe(false)

    // Advance time past reset
    vi.advanceTimersByTime(61 * 1000)

    // Should work again
    const allowedResult = checkRateLimit(ip)
    expect(allowedResult.allowed).toBe(true)
    expect(allowedResult.remaining).toBe(99)
  })

  it('should handle IPv6 addresses', () => {
    const ipv6 = '2001:0db8:85a3:0000:0000:8a2e:0370:7334'

    const result = checkRateLimit(ipv6)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(99)
  })

  it('should handle localhost addresses', () => {
    const localhost = '127.0.0.1'

    const result = checkRateLimit(localhost)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(99)
  })

  it('should handle empty string as IP', () => {
    const result = checkRateLimit('')
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(99)
  })

  it('should handle special characters in IP string', () => {
    const result = checkRateLimit('test-ip-123')
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(99)
  })

  it('should return same resetTime for blocked requests in same window', () => {
    const ip = '192.168.1.12'

    // Exhaust the limit
    for (let i = 0; i < 100; i++) {
      checkRateLimit(ip)
    }

    // Get blocked results
    const blocked1 = checkRateLimit(ip)
    const blocked2 = checkRateLimit(ip)

    expect(blocked1.resetTime).toBe(blocked2.resetTime)
  })

  it('should handle concurrent requests from different IPs', () => {
    const ips = Array.from({ length: 10 }, (_, i) => `192.168.2.${i}`)

    // Make requests from all IPs
    const results = ips.map((ip) => checkRateLimit(ip))

    // All should be allowed with 99 remaining
    expect(results.every((r) => r.allowed)).toBe(true)
    expect(results.every((r) => r.remaining === 99)).toBe(true)
  })

  it('should properly decrement remaining count', () => {
    const ip = '192.168.1.13'

    // Track remaining through multiple requests
    const remainingValues = []
    for (let i = 0; i < 10; i++) {
      const result = checkRateLimit(ip)
      remainingValues.push(result.remaining)
    }

    // Should be [99, 98, 97, 96, 95, 94, 93, 92, 91, 90]
    expect(remainingValues).toEqual([99, 98, 97, 96, 95, 94, 93, 92, 91, 90])
  })

  it('should handle time advancing in small increments', () => {
    const ip = '192.168.1.14'

    const result1 = checkRateLimit(ip)
    expect(result1.remaining).toBe(99)

    // Advance 30 seconds (half the window)
    vi.advanceTimersByTime(30 * 1000)

    const result2 = checkRateLimit(ip)
    expect(result2.remaining).toBe(98)
    expect(result2.resetTime).toBe(result1.resetTime) // Same reset time

    // Advance another 31 seconds (past the window)
    vi.advanceTimersByTime(31 * 1000)

    const result3 = checkRateLimit(ip)
    expect(result3.remaining).toBe(99) // Should reset
    expect(result3.resetTime).toBeGreaterThan(result1.resetTime)
  })

  it('should handle exactly at boundary conditions', () => {
    const ip = '192.168.1.15'

    const result1 = checkRateLimit(ip)
    const resetTime = result1.resetTime

    // Advance to just past the reset time (1ms after)
    vi.setSystemTime(resetTime + 1)

    const result2 = checkRateLimit(ip)
    // Should be considered expired (now > resetTime)
    expect(result2.remaining).toBe(99)
  })
})

describe('Rate Limiting - Cleanup Mechanism', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should clean up expired entries after 5 minutes', () => {
    const ip1 = '192.168.3.1'
    const ip2 = '192.168.3.2'

    // Make requests
    checkRateLimit(ip1)
    checkRateLimit(ip2)

    // Advance time to expire ip1
    vi.advanceTimersByTime(65 * 1000)

    // Advance time to trigger cleanup (5 minutes)
    vi.advanceTimersByTime(5 * 60 * 1000)

    // Make new requests
    const result1 = checkRateLimit(ip1)
    const result2 = checkRateLimit(ip2)

    // Both should have reset counters
    expect(result1.remaining).toBe(99)
    expect(result2.remaining).toBe(99)
  })

  it('should not interfere with active rate limits during cleanup', () => {
    const ip = '192.168.3.3'

    // Make some requests
    checkRateLimit(ip)
    checkRateLimit(ip)
    checkRateLimit(ip)

    // Advance time but not past the window
    vi.advanceTimersByTime(30 * 1000)

    // Trigger cleanup (5 minutes)
    vi.advanceTimersByTime(5 * 60 * 1000)

    // The rate limit should still be active (if within 60s window)
    // This tests that cleanup doesn't interfere
    const result = checkRateLimit(ip)
    expect(result.allowed).toBe(true)
  })
})
