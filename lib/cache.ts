export interface CacheEntry<T = unknown> {
  val: T;
  exp: number;
}

export type CacheStore<T = unknown> = Record<string, CacheEntry<T>>;

export const CACHE_KEYS = {
  NAMES: 'ap_meta_names',
  TIMES: 'ap_meta_times',
} as const;

const memoryCache: Record<string, CacheStore<unknown>> = {};

export function getStoredCache<T = unknown>(key: string): CacheStore<T> {
  // 1. Server check: Agar server par hai toh khali object bhej do
  if (typeof window === 'undefined') return {};

  if (memoryCache[key]) return memoryCache[key] as CacheStore<T>;

  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      memoryCache[key] = {};
      return {};
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const now = Date.now();
    const valid: CacheStore<T> = {};

    if (parsed && typeof parsed === 'object') {
      for (const [k, v] of Object.entries(parsed)) {
        const entry = v as CacheEntry<T>;
        if (
          entry &&
          typeof entry === 'object' &&
          'val' in entry &&
          'exp' in entry &&
          typeof entry.exp === 'number' &&
          entry.exp > now
        ) {
          valid[k] = entry;
        }
      }
    }

    memoryCache[key] = valid as CacheStore<unknown>;
    return valid;
  } catch {
    memoryCache[key] = {};
    return {};
  }
}

export function updateCache<T>(key: string, itemKey: string, value: T): void {
  // 2. Server check: Server par storage update nahi ho sakti
  if (typeof window === 'undefined') return;

  try {
    const cache = getStoredCache<T>(key);
    cache[itemKey] = { val: value, exp: Date.now() + 1000 * 60 * 60 * 24 * 7 };
    memoryCache[key] = cache as CacheStore<unknown>;
    localStorage.setItem(key, JSON.stringify(cache));
  } catch {
    // LocalStorage quota fallback (agar memory bhar jaye toh ignore)
  }
}