import { SignJWT } from "jose";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const TEST_SECRET = "Unit-Test-Only-JWT-Secret-2026!Secure-Value";
let tokens: typeof import("./tokens");

beforeAll(async () => {
  vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost:5432/test");
  vi.stubEnv("JWT_SECRET", TEST_SECRET);
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://test.upstash.io");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
  vi.stubEnv("NODE_ENV", "test");
  tokens = await import("./tokens");
});

afterAll(() => vi.unstubAllEnvs());

describe("typed authentication tokens", () => {
  it("does not accept a client token as a partner token", async () => {
    const clientToken = await tokens.signClientAccessToken({
      clientId: crypto.randomUUID(),
      sessionId: tokens.createSessionId(),
    });
    await expect(tokens.verifyPartnerAccessToken(clientToken)).resolves.toBeNull();
    await expect(tokens.verifyClientAccessToken(clientToken)).resolves.toMatchObject({
      type: "client-access",
    });
  });

  it("isole strictement l'audience livreur", async () => {
    const driverToken = await tokens.signDriverAccessToken({
      driverId: crypto.randomUUID(),
      restaurantId: crypto.randomUUID(),
      sessionId: tokens.createSessionId(),
      credentialsVersion: 2,
    });
    await expect(tokens.verifyPartnerAccessToken(driverToken)).resolves.toBeNull();
    await expect(tokens.verifyClientAccessToken(driverToken)).resolves.toBeNull();
    await expect(tokens.verifyDriverAccessToken(driverToken)).resolves.toMatchObject({
      type: "driver-access",
      credentialsVersion: 2,
    });
  });

  it("n'accepte pas un jeton d'activation comme jeton d'accès", async () => {
    const activationToken = await tokens.signDriverActivationToken({
      driverId: crypto.randomUUID(),
      restaurantId: crypto.randomUUID(),
      credentialsVersion: 1,
    });
    await expect(
      tokens.verifyDriverAccessToken(activationToken),
    ).resolves.toBeNull();
    await expect(
      tokens.verifyDriverActivationToken(activationToken),
    ).resolves.toMatchObject({ type: "driver-activation" });
  });

  it("rotates refresh JWT identifiers", async () => {
    const sessionId = tokens.createSessionId();
    const sessionExpiresAt = Math.floor(Date.now() / 1_000) + 3_600;
    const first = await tokens.signPartnerRefreshToken(
      { userId: crypto.randomUUID(), sessionId, sessionExpiresAt },
      sessionExpiresAt,
    );
    const second = await tokens.signPartnerRefreshToken(
      { userId: crypto.randomUUID(), sessionId, sessionExpiresAt },
      sessionExpiresAt,
    );
    const [firstPayload, secondPayload] = await Promise.all([
      tokens.verifyPartnerRefreshToken(first),
      tokens.verifyPartnerRefreshToken(second),
    ]);
    expect(firstPayload?.jti).toBeTruthy();
    expect(firstPayload?.jti).not.toBe(secondPayload?.jti);
  });

  it("rejects a correctly signed token missing required claims", async () => {
    const token = await new SignJWT({ type: "partner-access" })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuer(tokens.AUTH_TOKEN_ISSUER)
      .setAudience(tokens.AUTH_TOKEN_AUDIENCE.partner)
      .setIssuedAt()
      .setJti(crypto.randomUUID())
      .setExpirationTime("15m")
      .sign(new TextEncoder().encode(TEST_SECRET));

    await expect(tokens.verifyPartnerAccessToken(token)).resolves.toBeNull();
  });

  it("accepts a complete partner access token", async () => {
    const token = await tokens.signPartnerAccessToken({
      userId: crypto.randomUUID(),
      role: "partner",
      sessionId: tokens.createSessionId(),
    });
    await expect(tokens.verifyPartnerAccessToken(token)).resolves.toMatchObject({
      type: "partner-access",
      role: "partner",
    });
  });
});
