export type RateLimitCheckInput = {
  namespace: string;
  identifier: string;
  maxRequests: number;
  windowMs: number;
  nowMs?: number;
};

export type RateLimitCheckResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAtMs: number;
  retryAfterSeconds: number;
};

type RateLimitBucket = {
  count: number;
  resetAtMs: number;
};

const buckets = new Map<string, RateLimitBucket>();
const MAX_BUCKETS = 10_000;

function toBucketKey(namespace: string, identifier: string): string {
  const safeNamespace = namespace.trim() || "global";
  const safeIdentifier = identifier.trim() || "anonymous";
  return `${safeNamespace}:${safeIdentifier}`;
}

function pruneExpiredBuckets(nowMs: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAtMs <= nowMs) {
      buckets.delete(key);
    }
  }
}

export function checkRateLimit(input: RateLimitCheckInput): RateLimitCheckResult {
  const nowMs = input.nowMs ?? Date.now();
  const windowMs = Math.max(1_000, input.windowMs);
  const maxRequests = Math.max(1, input.maxRequests);
  const key = toBucketKey(input.namespace, input.identifier);

  if (buckets.size >= MAX_BUCKETS) {
    pruneExpiredBuckets(nowMs);
  }

  const existing = buckets.get(key);
  if (!existing || existing.resetAtMs <= nowMs) {
    const resetAtMs = nowMs + windowMs;
    buckets.set(key, { count: 1, resetAtMs });
    return {
      allowed: true,
      limit: maxRequests,
      remaining: Math.max(0, maxRequests - 1),
      resetAtMs,
      retryAfterSeconds: 0,
    };
  }

  if (existing.count >= maxRequests) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAtMs - nowMs) / 1_000));
    return {
      allowed: false,
      limit: maxRequests,
      remaining: 0,
      resetAtMs: existing.resetAtMs,
      retryAfterSeconds,
    };
  }

  existing.count += 1;
  buckets.set(key, existing);
  return {
    allowed: true,
    limit: maxRequests,
    remaining: Math.max(0, maxRequests - existing.count),
    resetAtMs: existing.resetAtMs,
    retryAfterSeconds: 0,
  };
}

export function resetRateLimitBucketsForTests(): void {
  buckets.clear();
}
