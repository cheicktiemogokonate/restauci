import "server-only";

import { randomUUID } from "node:crypto";
import { env } from "@/infrastructure/env";
import { jwtVerify, SignJWT, type JWTPayload as JosePayload } from "jose";

export const AUTH_TOKEN_ISSUER = "restau-platform";
export const AUTH_COOKIE_NAME =
  env.NODE_ENV === "production" ? "__Host-restauci_session" : env.JWT_COOKIE_NAME;
export const LEGACY_AUTH_COOKIE_NAME = "token";

const TOKEN_AUDIENCES = {
  web: "restau-web",
  partner: "restau-partner-api",
  client: "restau-client-api",
  driver: "restau-driver-api",
} as const;

const JWT_SECRET = new TextEncoder().encode(env.JWT_SECRET);

type UserRole = "partner" | "admin";
type SessionDuration = "standard" | "extended";
type Expiration = string | number | Date;

interface RequiredTokenClaims extends JosePayload {
  type: string;
  jti: string;
  iat: number;
  exp: number;
  issuedAtMs: number;
}

export interface WebSessionToken extends RequiredTokenClaims {
  type: "web-session";
  userId: string;
  email: string;
  role: UserRole;
}

export interface PartnerAccessToken extends RequiredTokenClaims {
  type: "partner-access";
  userId: string;
  role: UserRole;
  sessionId: string;
}

export interface PartnerRefreshToken extends RequiredTokenClaims {
  type: "partner-refresh";
  userId: string;
  sessionId: string;
  sessionExpiresAt: number;
}

export interface ClientAccessToken extends RequiredTokenClaims {
  type: "client-access";
  clientId: string;
  sessionId: string;
}

export interface ClientRefreshToken extends RequiredTokenClaims {
  type: "client-refresh";
  clientId: string;
  sessionId: string;
  sessionDuration: SessionDuration;
  sessionExpiresAt: number;
}

export interface DriverAccessToken extends RequiredTokenClaims {
  type: "driver-access";
  driverId: string;
  restaurantId: string;
  sessionId: string;
  credentialsVersion: number;
}

export interface DriverRefreshToken extends RequiredTokenClaims {
  type: "driver-refresh";
  driverId: string;
  restaurantId: string;
  sessionId: string;
  credentialsVersion: number;
  sessionExpiresAt: number;
}

export interface DriverActivationToken extends RequiredTokenClaims {
  type: "driver-activation";
  driverId: string;
  restaurantId: string;
  credentialsVersion: number;
}

function issueToken(
  payload: Record<string, unknown>,
  type: RequiredTokenClaims["type"],
  audience: (typeof TOKEN_AUDIENCES)[keyof typeof TOKEN_AUDIENCES],
  expiresAt: Expiration,
) {
  return new SignJWT({ ...payload, type, issuedAtMs: Date.now() })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(AUTH_TOKEN_ISSUER)
    .setAudience(audience)
    .setIssuedAt()
    .setJti(randomUUID())
    .setExpirationTime(expiresAt)
    .sign(JWT_SECRET);
}

async function verifyTypedToken<T extends RequiredTokenClaims>(
  token: string,
  type: T["type"],
  audience: (typeof TOKEN_AUDIENCES)[keyof typeof TOKEN_AUDIENCES],
  hasExpectedClaims: (payload: JosePayload) => payload is T,
): Promise<T | null> {
  try {
    const { payload, protectedHeader } = await jwtVerify(token, JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: AUTH_TOKEN_ISSUER,
      audience,
    });
    if (
      protectedHeader.typ !== "JWT" ||
      payload.type !== type ||
      typeof payload.jti !== "string" ||
      typeof payload.iat !== "number" ||
      typeof payload.exp !== "number" ||
      !Number.isSafeInteger(payload.issuedAtMs) ||
      !hasExpectedClaims(payload)
    ) {
      return null;
    }
    return payload as T;
  } catch {
    return null;
  }
}

export function createSessionId() {
  return randomUUID();
}

export function signWebSessionToken(input: {
  userId: string;
  email: string;
  role: UserRole;
}) {
  return issueToken(
    input,
    "web-session",
    TOKEN_AUDIENCES.web,
    input.role === "admin" ? "1h" : "8h",
  );
}

export function verifyWebSessionToken(token: string) {
  return verifyTypedToken<WebSessionToken>(
    token,
    "web-session",
    TOKEN_AUDIENCES.web,
    (payload): payload is WebSessionToken =>
      typeof payload.userId === "string" &&
      typeof payload.email === "string" &&
      (payload.role === "partner" || payload.role === "admin"),
  );
}

export function signPartnerAccessToken(
  input: { userId: string; role: UserRole; sessionId: string },
  expiresAt: Expiration = "15m",
) {
  return issueToken(
    input,
    "partner-access",
    TOKEN_AUDIENCES.partner,
    expiresAt,
  );
}

export function verifyPartnerAccessToken(token: string) {
  return verifyTypedToken<PartnerAccessToken>(
    token,
    "partner-access",
    TOKEN_AUDIENCES.partner,
    (payload): payload is PartnerAccessToken =>
      typeof payload.userId === "string" &&
      typeof payload.sessionId === "string" &&
      (payload.role === "partner" || payload.role === "admin"),
  );
}

export function signPartnerRefreshToken(
  input: { userId: string; sessionId: string; sessionExpiresAt: number },
  expiresAt: Expiration,
) {
  return issueToken(
    input,
    "partner-refresh",
    TOKEN_AUDIENCES.partner,
    expiresAt,
  );
}

export function verifyPartnerRefreshToken(token: string) {
  return verifyTypedToken<PartnerRefreshToken>(
    token,
    "partner-refresh",
    TOKEN_AUDIENCES.partner,
    (payload): payload is PartnerRefreshToken =>
      typeof payload.userId === "string" &&
      typeof payload.sessionId === "string" &&
      Number.isSafeInteger(payload.sessionExpiresAt),
  );
}

export function signClientAccessToken(
  input: { clientId: string; sessionId: string },
  expiresAt: Expiration = "15m",
) {
  return issueToken(input, "client-access", TOKEN_AUDIENCES.client, expiresAt);
}

export function verifyClientAccessToken(token: string) {
  return verifyTypedToken<ClientAccessToken>(
    token,
    "client-access",
    TOKEN_AUDIENCES.client,
    (payload): payload is ClientAccessToken =>
      typeof payload.clientId === "string" &&
      typeof payload.sessionId === "string",
  );
}

export function signClientRefreshToken(
  input: {
    clientId: string;
    sessionId: string;
    sessionDuration: SessionDuration;
    sessionExpiresAt: number;
  },
  expiresAt: Expiration,
) {
  return issueToken(input, "client-refresh", TOKEN_AUDIENCES.client, expiresAt);
}

export function verifyClientRefreshToken(token: string) {
  return verifyTypedToken<ClientRefreshToken>(
    token,
    "client-refresh",
    TOKEN_AUDIENCES.client,
    (payload): payload is ClientRefreshToken =>
      typeof payload.clientId === "string" &&
      typeof payload.sessionId === "string" &&
      (payload.sessionDuration === "standard" ||
        payload.sessionDuration === "extended") &&
      Number.isSafeInteger(payload.sessionExpiresAt),
  );
}

export function signDriverAccessToken(
  input: {
    driverId: string;
    restaurantId: string;
    sessionId: string;
    credentialsVersion: number;
  },
  expiresAt: Expiration = "15m",
) {
  return issueToken(input, "driver-access", TOKEN_AUDIENCES.driver, expiresAt);
}

export function verifyDriverAccessToken(token: string) {
  return verifyTypedToken<DriverAccessToken>(
    token,
    "driver-access",
    TOKEN_AUDIENCES.driver,
    (payload): payload is DriverAccessToken =>
      typeof payload.driverId === "string" &&
      typeof payload.restaurantId === "string" &&
      typeof payload.sessionId === "string" &&
      Number.isSafeInteger(payload.credentialsVersion),
  );
}

export function signDriverRefreshToken(
  input: {
    driverId: string;
    restaurantId: string;
    sessionId: string;
    credentialsVersion: number;
    sessionExpiresAt: number;
  },
  expiresAt: Expiration,
) {
  return issueToken(input, "driver-refresh", TOKEN_AUDIENCES.driver, expiresAt);
}

export function verifyDriverRefreshToken(token: string) {
  return verifyTypedToken<DriverRefreshToken>(
    token,
    "driver-refresh",
    TOKEN_AUDIENCES.driver,
    (payload): payload is DriverRefreshToken =>
      typeof payload.driverId === "string" &&
      typeof payload.restaurantId === "string" &&
      typeof payload.sessionId === "string" &&
      Number.isSafeInteger(payload.credentialsVersion) &&
      Number.isSafeInteger(payload.sessionExpiresAt),
  );
}

export function signDriverActivationToken(
  input: {
    driverId: string;
    restaurantId: string;
    credentialsVersion: number;
  },
  expiresAt: Expiration = "15m",
) {
  return issueToken(
    input,
    "driver-activation",
    TOKEN_AUDIENCES.driver,
    expiresAt,
  );
}

export function verifyDriverActivationToken(token: string) {
  return verifyTypedToken<DriverActivationToken>(
    token,
    "driver-activation",
    TOKEN_AUDIENCES.driver,
    (payload): payload is DriverActivationToken =>
      typeof payload.driverId === "string" &&
      typeof payload.restaurantId === "string" &&
      Number.isSafeInteger(payload.credentialsVersion),
  );
}

export const AUTH_TOKEN_AUDIENCE = TOKEN_AUDIENCES;
