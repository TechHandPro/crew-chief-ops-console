/**
 * Tiny in-process TTL memoizer. Keeps a burst of page views from turning
 * into a burst of MCP round-trips; not a shared cache and not persistent.
 */
export class TtlMemo {
  private readonly entries = new Map<string, { expiresAt: number; value: Promise<unknown> }>();

  constructor(
    private readonly ttlMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  async get<T>(key: string, load: () => Promise<T>): Promise<T> {
    if (this.ttlMs <= 0) return load();

    const hit = this.entries.get(key);
    const current = this.now();
    if (hit && hit.expiresAt > current) {
      return hit.value as Promise<T>;
    }

    const value = load();
    this.entries.set(key, { expiresAt: current + this.ttlMs, value });
    value.catch(() => {
      // Never cache failures: the next read should try again.
      if (this.entries.get(key)?.value === value) this.entries.delete(key);
    });
    return value;
  }

  clear(): void {
    this.entries.clear();
  }
}

export function memoKey(parts: Record<string, unknown>): string {
  return JSON.stringify(parts, Object.keys(parts).sort());
}
