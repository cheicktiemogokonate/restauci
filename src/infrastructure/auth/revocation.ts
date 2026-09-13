import { redis } from "@/infrastructure/cache/redis";

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

function sessionRevocationKey(sessionId: string) {
  return `toutci:revoked-session:${sessionId}`;
}

export async function isSessionRevoked(sessionId: string) {
  return Boolean(await redis.get(sessionRevocationKey(sessionId)));
}

export async function revokeSession(sessionId: string, expiresAt: number) {
  const now = Math.floor(Date.now() / 1_000);
  await redis.set(sessionRevocationKey(sessionId), "1", {
    ex: Math.max(1, expiresAt - now),
  });
}

type SessionOwnerType = "user" | "client" | "driver";

function ownerRevocationKey(ownerType: SessionOwnerType, ownerId: string) {
  return `toutci:revoked-owner:${ownerType}:${ownerId}`;
}

export async function revokeOwnerSessions(
  ownerType: SessionOwnerType,
  ownerId: string,
) {
  const cutoff = Date.now();
  await redis.set(ownerRevocationKey(ownerType, ownerId), String(cutoff));
  return cutoff;
}

export async function isOwnerSessionRevoked(
  ownerType: SessionOwnerType,
  ownerId: string,
  issuedAtMs: number,
) {
  const rawCutoff = await redis.get<string>(
    ownerRevocationKey(ownerType, ownerId),
  );
  if (!rawCutoff) return false;
  const cutoff = Number(rawCutoff);
  return Number.isFinite(cutoff) && issuedAtMs <= cutoff;
}

export async function consumeAdminTotp(
  userId: string,
  counter: number,
) {
  const result = await redis.set(
    `toutci:admin-totp:${userId}:${counter}`,
    "1",
    { ex: 90, nx: true },
  );
  return result === "OK";
}

/**
 * Consomme un jeton une seule fois de manière atomique. Le même espace de clés
 * sert à la révocation et à la rotation : un jeton déconnecté ou déjà tourné
 * ne peut donc jamais gagner une course concurrente.
 */
export async function consumeTokenOnce(token: string, expiresAt: number) {
  const now = Math.floor(Date.now() / 1_000);
  const ttl = Math.max(1, expiresAt - now);
  const result = await redis.set(
    `toutci:blacklist:${await tokenDigest(token)}`,
    "1",
    { ex: ttl, nx: true },
  );
  return result === "OK";
}
