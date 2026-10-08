type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

/**
 * A tiny in-process cache. Two things matter here beyond speed:
 *
 * 1. It is bounded. Entries are keyed per user and per note, so `notes:detail:<id>:<uid>`
 *    alone grows one row for every (note, reader) pair the process ever serves. With
 *    no ceiling and expiry only checked on read, that map grows for the lifetime of
 *    the server and never shrinks.
 * 2. Expired rows are swept on write, not just lazily on read, so an entry nobody
 *    asks for again still gets reclaimed.
 */

const store = new Map<string, CacheEntry<unknown>>();
const MAX_ENTRIES = 500;

function dropExpired(now: number) {
  for (const [key, entry] of store) {
    if (now > entry.expiresAt) store.delete(key);
  }
}

function makeRoom() {
  if (store.size < MAX_ENTRIES) return;
  dropExpired(Date.now());
  // Nothing expired: evict oldest insertions first. Map iterates in insertion order.
  while (store.size >= MAX_ENTRIES) {
    const oldest = store.keys().next();
    if (oldest.done) break;
    store.delete(oldest.value);
  }
}

export function cacheGet<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cacheDel(key);
    return undefined;
  }
  return entry.value as T;
}

export function cacheSet<T>(key: string, value: T, ttlMs: number): void {
  makeRoom();
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function cacheDel(key: string): void {
  store.delete(key);
}

export function cacheDelPattern(pattern: RegExp): void {
  for (const key of store.keys()) {
    if (pattern.test(key)) store.delete(key);
  }
}

export function cacheClear(): void {
  store.clear();
}

/** Entry count, for tests. */
export function cacheSize(): number {
  return store.size;
}
