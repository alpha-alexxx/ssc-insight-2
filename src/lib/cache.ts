import "server-only";

/**
 * Tiny LRU cache for server-side data that changes rarely.
 *
 * - Per-process, in-memory (no cross-instance coordination). Intended for
 *   single-instance or sticky-session deployments; production multi-instance
 *   setups would replace this with Redis or the Neon pool's own cache.
 * - Write-through: callers explicitly invalidate after a write.
 * - TTL-bounded so a crash or process recycle cannot serve stale data forever.
 */
type Entry<V> = { value: V; expiresAt: number; size: number };

export class LruCache<K = string, V = unknown> {
  private readonly store = new Map<K, Entry<V>>();
  private readonly ttlMs: number;
  private readonly maxBytes: number;
  private bytes = 0;

  constructor(opts: { ttlMs: number; maxBytes?: number }) {
    this.ttlMs = opts.ttlMs;
    this.maxBytes = opts.maxBytes ?? 1_000_000; // ~1 MB default
  }

  get(key: K): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt < Date.now()) {
      this.evict(key, entry.size);
      return undefined;
    }
    // Move to end (most-recently-used) by re-inserting.
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key: K, value: V, size = 256) {
    const existing = this.store.get(key);
    if (existing) this.evict(key, existing.size);
    while (this.bytes + size > this.maxBytes && this.store.size > 0) {
      const oldest = this.store.keys().next().value;
      if (oldest === undefined) break;
      const entry = this.store.get(oldest);
      if (entry) this.evict(oldest, entry.size);
    }
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs, size });
    this.bytes += size;
  }

  invalidate(key: K) {
    const entry = this.store.get(key);
    if (entry) this.evict(key, entry.size);
  }

  /** Atomic read-through helper. `loader` runs only on a miss. */
  async getOrLoad(key: K, loader: () => Promise<V>, size?: number): Promise<V> {
    const hit = this.get(key);
    if (hit !== undefined) return hit;
    const value = await loader();
    this.set(key, value, size);
    return value;
  }

  private evict(key: K, size: number) {
    this.store.delete(key);
    this.bytes -= size;
    if (this.bytes < 0) this.bytes = 0;
  }
}
