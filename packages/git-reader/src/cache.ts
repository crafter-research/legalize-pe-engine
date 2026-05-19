import { LRUCache } from 'lru-cache'

const FIVE_MINUTES = 5 * 60 * 1000
const ONE_HOUR = 60 * 60 * 1000

// biome-ignore lint/suspicious/noExplicitAny: LRUCache requires non-nullable V
export const historyCache = new LRUCache<string, any>({
  max: 100,
  ttl: FIVE_MINUTES,
})

// biome-ignore lint/suspicious/noExplicitAny: LRUCache requires non-nullable V
export const contentCache = new LRUCache<string, any>({
  max: 50,
  ttl: ONE_HOUR,
})

// biome-ignore lint/suspicious/noExplicitAny: LRUCache requires non-nullable V
export const diffCache = new LRUCache<string, any>({
  max: 50,
  ttl: ONE_HOUR,
})
