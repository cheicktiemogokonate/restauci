import { redis } from "@/lib/cache/redis";

async function tokenDigest(token: string) {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function isTokenBlacklisted(token: string) {
  return Boolean(await redis.get(`toutci:blacklist:${await tokenDigest(token)}`));
}

export async function blacklistToken(token: string, expiresAt?: number) {
  const now = Math.floor(Date.now() / 1_000);
  const ttl = Math.max(1, (expiresAt ?? now + 15 * 60) - now);
  await redis.set(`toutci:blacklist:${await tokenDigest(token)}`, "1", {
    ex: ttl,
  });
}
