import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function decodeBase32(value: string): Buffer | null {
  const normalized = value.toUpperCase().replace(/\s+/g, "").replace(/=+$/, "");
  if (!normalized || !/^[A-Z2-7]+$/.test(normalized)) return null;

  let bits = "";
  for (const character of normalized) {
    bits += BASE32_ALPHABET.indexOf(character).toString(2).padStart(5, "0");
  }

  const bytes: number[] = [];
  for (let offset = 0; offset + 8 <= bits.length; offset += 8) {
    bytes.push(Number.parseInt(bits.slice(offset, offset + 8), 2));
  }
  return Buffer.from(bytes);
}

function totpForCounter(secret: Buffer, counter: number): string {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", secret).update(counterBuffer).digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const binary =
    ((digest[offset]! & 0x7f) << 24) |
    ((digest[offset + 1]! & 0xff) << 16) |
    ((digest[offset + 2]! & 0xff) << 8) |
    (digest[offset + 3]! & 0xff);
  return String(binary % 1_000_000).padStart(6, "0");
}

/** Retourne le compteur accepté afin de pouvoir bloquer son rejeu. */
export function verifyTotp(
  code: string,
  base32Secret: string,
  nowMs = Date.now(),
  window = 1,
): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const secret = decodeBase32(base32Secret);
  if (!secret || secret.length < 16) return null;

  const currentCounter = Math.floor(nowMs / 30_000);
  const provided = Buffer.from(code);
  for (let delta = -window; delta <= window; delta += 1) {
    const counter = currentCounter + delta;
    if (counter < 0) continue;
    const expected = Buffer.from(totpForCounter(secret, counter));
    if (timingSafeEqual(provided, expected)) return counter;
  }
  return null;
}
