/**
 * Lightweight, per-process fixed-window limiter.
 *
 * It blunts bursts against the login/registration server actions on a single
 * instance. Distributed deployments must add an edge/WAF or Redis-backed
 * limiter; the database-backed account lockout in `authorizeCredentials`
 * remains effective across instances for credential stuffing on one account.
 */

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 5_000;

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

function pruneExpired(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

export function consumeRateLimit(
  key: string,
  options: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  if (buckets.size > MAX_KEYS) {
    pruneExpired(now);
    if (buckets.size > MAX_KEYS) {
      buckets.clear();
    }
  }

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return {
      allowed: true,
      remaining: Math.max(0, options.limit - 1),
      retryAfterSeconds: 0,
    };
  }

  existing.count += 1;
  if (existing.count > options.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  return {
    allowed: true,
    remaining: Math.max(0, options.limit - existing.count),
    retryAfterSeconds: 0,
  };
}

/** Test-only helper; not exported through any route. */
export function resetRateLimitState(): void {
  buckets.clear();
}
