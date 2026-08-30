import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { DELIVERY_PROOF_CODE_LENGTH } from "../model";

function proofDigest(deliveryId: string, code: string): Buffer {
  return createHmac("sha256", env.JWT_SECRET)
    .update(`delivery-proof-code:v1:${deliveryId}:${code}`)
    .digest();
}

export function deriveDeliveryProofCode(
  deliveryId: string,
  nonce: string,
): string {
  const bytes = createHmac("sha256", env.JWT_SECRET)
    .update(`delivery-proof-seed:v1:${deliveryId}:${nonce}`)
    .digest();
  const maximum = 10 ** DELIVERY_PROOF_CODE_LENGTH;
  return String(bytes.readUIntBE(0, 6) % maximum).padStart(
    DELIVERY_PROOF_CODE_LENGTH,
    "0",
  );
}

export function createDeliveryProof(deliveryId: string) {
  const nonce = randomBytes(16).toString("hex");
  const code = deriveDeliveryProofCode(deliveryId, nonce);
  return {
    code,
    nonce,
    digest: proofDigest(deliveryId, code).toString("hex"),
  };
}

export function verifyDeliveryProofCode(input: {
  deliveryId: string;
  code: string;
  expectedDigest: string;
}): boolean {
  if (!/^[0-9]{6}$/.test(input.code) || !/^[0-9a-f]{64}$/.test(input.expectedDigest)) {
    return false;
  }
  return timingSafeEqual(
    proofDigest(input.deliveryId, input.code),
    Buffer.from(input.expectedDigest, "hex"),
  );
}
