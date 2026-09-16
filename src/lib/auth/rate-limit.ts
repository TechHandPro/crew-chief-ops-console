/**
 * Fixed-window failure counter for the sign-in form. In-process only: a
 * multi-instance deployment should front this with its proxy's limiter, but
 * this stops a single instance from being brute-forced from one address.
 */
export class FailureLimiter {
  private readonly buckets = new Map<string, { count: number; windowStart: number }>();

  constructor(
    private readonly maxFailures: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  isBlocked(key: string): boolean {
    const bucket = this.buckets.get(key);
    if (!bucket) return false;
    if (this.now() - bucket.windowStart >= this.windowMs) {
      this.buckets.delete(key);
      return false;
    }
    return bucket.count >= this.maxFailures;
  }

  recordFailure(key: string): void {
    const current = this.now();
    const bucket = this.buckets.get(key);
    if (!bucket || current - bucket.windowStart >= this.windowMs) {
      this.buckets.set(key, { count: 1, windowStart: current });
      return;
    }
    bucket.count += 1;
    if (this.buckets.size > 10_000) this.prune(current);
  }

  reset(key: string): void {
    this.buckets.delete(key);
  }

  private prune(current: number): void {
    for (const [key, bucket] of this.buckets) {
      if (current - bucket.windowStart >= this.windowMs) this.buckets.delete(key);
    }
  }
}
