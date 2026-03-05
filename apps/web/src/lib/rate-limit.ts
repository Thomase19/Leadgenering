// In-memory rate limit for widget endpoints (per siteId + visitorId or IP).
// For production, use Redis-based rate limiting.

const windowMs = 60 * 1000; // 1 minute
const maxPerWindow = 60; // 60 requests per minute per key

const store = new Map<string, { count: number; resetAt: number }>();

function getKey(siteId: string, clientId: string): string {
  return `widget:${siteId}:${clientId}`;
}

export function checkRateLimit(siteId: string, clientId: string): boolean {
  const key = getKey(siteId, clientId);
  const now = Date.now();
  let entry = store.get(key);
  if (!entry) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (now > entry.resetAt) {
    entry = { count: 1, resetAt: now + windowMs };
    store.set(key, entry);
    return true;
  }
  entry.count++;
  if (entry.count > maxPerWindow) return false;
  return true;
}

// Clean old entries periodically
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of store.entries()) {
      if (now > v.resetAt) store.delete(k);
    }
  }, 60000);
}

// Beacon: max 1 per visitorId+siteId per 2 seconds (avoid double-count same page load)
const beaconWindowMs = 2000;
const beaconStore = new Map<string, number>();

export function checkBeaconRateLimit(siteId: string, visitorId: string): boolean {
  const key = `beacon:${siteId}:${visitorId}`;
  const now = Date.now();
  const last = beaconStore.get(key);
  if (last != null && now - last < beaconWindowMs) return false;
  beaconStore.set(key, now);
  return true;
}
