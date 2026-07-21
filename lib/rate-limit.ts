const requests = new Map<string, number[]>();
export function rateLimit(key: string, limit = 12, windowMs = 60_000) {
  const now = Date.now(); const active = (requests.get(key) ?? []).filter((time) => now - time < windowMs);
  if (active.length >= limit) return false; active.push(now); requests.set(key, active); return true;
}

