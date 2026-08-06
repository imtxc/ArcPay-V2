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
        if (
          v &&
          typeof v === 'object' &&
          'val' in v &&
          'exp' in v &&
          typeof (v as CacheEntry).exp === 'number' &&
          (v as CacheEntry).exp > now
        ) {
          valid[k] = v as CacheEntry<T>;
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
  try {
    const cache = getStoredCache<T>(key);
    cache[itemKey] = { val: value, exp: Date.now() + 1000 * 60 * 60 * 24 * 7 };
    memoryCache[key] = cache as CacheStore<unknown>;
    localStorage.setItem(key, JSON.stringify(cache));
  } catch {
    // LocalStorage quota fallback
  }
}