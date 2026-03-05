import { createHash } from "crypto";

/** Hash IP for GDPR; never store raw IP. */
export function hashIp(ip: string | null | undefined): string | null {
  if (!ip || ip === "::1" || ip === "127.0.0.1") return null;
  return createHash("sha256").update(ip + (process.env.IP_HASH_SALT ?? "leadbot")).digest("hex").slice(0, 32);
}

export function getClientIp(headers: Headers): string | null {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headers.get("x-real-ip") ?? null;
}
