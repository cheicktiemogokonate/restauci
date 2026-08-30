import { beforeAll, describe, expect, it, vi } from "vitest";

let proof: typeof import("./proof");

beforeAll(async () => {
  vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost:5432/test");
  vi.stubEnv("JWT_SECRET", "Delivery-Proof-Test-Secret-2026!StrongValue");
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://test.upstash.io");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
  vi.stubEnv("NODE_ENV", "test");
  proof = await import("./proof");
});

describe("delivery proof", () => {
  it("produit un code client à six chiffres sans le stocker en clair", () => {
    const deliveryId = crypto.randomUUID();
    const created = proof.createDeliveryProof(deliveryId);
    expect(created.code).toMatch(/^\d{6}$/);
    expect(created.nonce).not.toContain(created.code);
    expect(created.digest).not.toContain(created.code);
    expect(
      proof.verifyDeliveryProofCode({
        deliveryId,
        code: created.code,
        expectedDigest: created.digest,
      }),
    ).toBe(true);
  });

  it("refuse un code erroné ou lié à une autre livraison", () => {
    const deliveryId = crypto.randomUUID();
    const created = proof.createDeliveryProof(deliveryId);
    expect(
      proof.verifyDeliveryProofCode({
        deliveryId,
        code: created.code === "000000" ? "000001" : "000000",
        expectedDigest: created.digest,
      }),
    ).toBe(false);
    expect(
      proof.verifyDeliveryProofCode({
        deliveryId: crypto.randomUUID(),
        code: created.code,
        expectedDigest: created.digest,
      }),
    ).toBe(false);
  });
});
