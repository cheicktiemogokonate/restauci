import { createHash } from "node:crypto";
import {
  MAX_IDENTITY_DOCUMENT_SIZE,
  type IdentityDocumentContentType,
} from "../model";

export interface ValidatedIdentityDocument {
  contentType: IdentityDocumentContentType;
  extension: "jpg" | "png" | "pdf";
  sha256: string;
}

function hasBytes(
  buffer: Uint8Array,
  offset: number,
  expected: readonly number[],
) {
  return expected.every((byte, index) => buffer[offset + index] === byte);
}

export function validateIdentityDocument(
  buffer: Buffer,
): ValidatedIdentityDocument | null {
  if (buffer.length === 0 || buffer.length > MAX_IDENTITY_DOCUMENT_SIZE) {
    return null;
  }

  let detected:
    | Pick<ValidatedIdentityDocument, "contentType" | "extension">
    | undefined;

  if (buffer.length >= 3 && hasBytes(buffer, 0, [0xff, 0xd8, 0xff])) {
    detected = { contentType: "image/jpeg", extension: "jpg" };
  } else if (
    buffer.length >= 8 &&
    hasBytes(buffer, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  ) {
    detected = { contentType: "image/png", extension: "png" };
  } else if (
    buffer.length >= 5 &&
    hasBytes(buffer, 0, [0x25, 0x50, 0x44, 0x46, 0x2d])
  ) {
    detected = { contentType: "application/pdf", extension: "pdf" };
  }

  if (!detected) return null;
  return {
    ...detected,
    sha256: createHash("sha256").update(buffer).digest("hex"),
  };
}
