const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 100;

interface RequestRecord {
  count: number;
  resetTime: number;
}

const requestCounts = new Map<string, RequestRecord>();

// Clean up old entries every 5 minutes
setInterval(
  () => {
    const now = Date.now();
    for (const [ip, record] of requestCounts.entries()) {
      if (now > record.resetTime) {
        requestCounts.delete(ip);
      }
    }
  },
  5 * 60 * 1000,
);

export function checkRateLimit(ip: string): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
} {
  const now = Date.now();
  const record = requestCounts.get(ip);

  if (!record || now > record.resetTime) {
    // Create new record or reset expired one
    const resetTime = now + WINDOW_MS;
    requestCounts.set(ip, { count: 1, resetTime });
    return { allowed: true, remaining: MAX_REQUESTS - 1, resetTime };
  }

  // Increment atomically and check
  const currentCount = ++record.count;

  if (currentCount > MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }

  return {
    allowed: true,
    remaining: MAX_REQUESTS - currentCount,
    resetTime: record.resetTime,
  };
}
