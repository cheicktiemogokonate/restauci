import "server-only";

import { randomBytes } from "node:crypto";
import { compare, hash } from "bcryptjs";
import {
  createSessionId,
  signDriverAccessToken,
  signDriverRefreshToken,
} from "@/infrastructure/auth/tokens";

const DRIVER_PASSWORD_COST = 12;
const DRIVER_ACCESS_EXPIRES_IN_SECONDS = 15 * 60;
const DRIVER_SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
export const DRIVER_TEMPORARY_PASSWORD_TTL_MS = 24 * 60 * 60 * 1_000;

const DUMMY_DRIVER_PASSWORD_HASH =
  "$2b$12$uTgttD2C7DC66CkZOWNP..p1.dVZb72d./VYmD08jia4VsjYPs3O2";

export function generateDriverLoginId(): string {
  return `LIV-${randomBytes(8).toString("hex").toUpperCase()}`;
}

export function generateTemporaryDriverPassword(): string {
  return `${randomBytes(15).toString("base64url")}!aA1`;
}

export function getTemporaryPasswordExpiry(now = new Date()): Date {
  return new Date(now.getTime() + DRIVER_TEMPORARY_PASSWORD_TTL_MS);
}

export function hashDriverPassword(password: string): Promise<string> {
  return hash(password, DRIVER_PASSWORD_COST);
}

export function verifyDriverPassword(
  password: string,
  passwordHash: string | null,
): Promise<boolean> {
  return compare(password, passwordHash ?? DUMMY_DRIVER_PASSWORD_HASH);
}

export async function issueDriverSessionTokens(input: {
  driverId: string;
  restaurantId: string;
  credentialsVersion: number;
  sessionId?: string;
  sessionExpiresAt?: number;
}) {
  const now = Math.floor(Date.now() / 1_000);
  const sessionId = input.sessionId ?? createSessionId();
  const sessionExpiresAt =
    input.sessionExpiresAt ?? now + DRIVER_SESSION_MAX_AGE_SECONDS;
  const refreshExpiresAt = Math.min(
    now + DRIVER_SESSION_MAX_AGE_SECONDS,
    sessionExpiresAt,
  );
  const claims = {
    driverId: input.driverId,
    restaurantId: input.restaurantId,
    sessionId,
    credentialsVersion: input.credentialsVersion,
  };
  const [accessToken, refreshToken] = await Promise.all([
    signDriverAccessToken(claims),
    signDriverRefreshToken(
      { ...claims, sessionExpiresAt },
      refreshExpiresAt,
    ),
  ]);
  return {
    accessToken,
    refreshToken,
    accessExpiresIn: DRIVER_ACCESS_EXPIRES_IN_SECONDS,
    refreshMaxAge: Math.max(0, refreshExpiresAt - now),
    sessionId,
    sessionExpiresAt,
  };
}
