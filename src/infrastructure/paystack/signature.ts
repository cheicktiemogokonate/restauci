import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

export function computePaystackSignature(rawBody: string | Buffer, secret: string): string {
  return createHmac("sha512", secret).update(rawBody).digest("hex");
}

export function verifyPaystackSignature(
  rawBody: string | Buffer,
  receivedSignature: string | null,
  secret: string,
): boolean {
  if (!receivedSignature || !/^[a-f0-9]{128}$/i.test(receivedSignature)) return false;
  const expected = Buffer.from(computePaystackSignature(rawBody, secret), "hex");
  const received = Buffer.from(receivedSignature, "hex");
  return expected.length === received.length && timingSafeEqual(expected, received);
}
