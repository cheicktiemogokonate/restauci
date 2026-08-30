import { createHash } from "node:crypto";
import {
  MAX_IDENTITY_DOCUMENT_SIZE,
  type IdentityDocumentContentType,
} from "../model";

export interface ValidatedIdentityDocument {
  contentType: IdentityDocumentContentType;
  extension: "jpg" | "png" | "pdf";
  sha256: string;
  body: Buffer;
}

const ACTIVE_PDF_TOKENS =
  /\/(?:JavaScript|JS|OpenAction|AA|Launch|EmbeddedFile|XFA)\b/i;

function hasBytes(
  buffer: Uint8Array,
  offset: number,
  expected: readonly number[],
) {
  return expected.every((byte, index) => buffer[offset + index] === byte);
}

export async function validateIdentityDocument(
  buffer: Buffer,
): Promise<ValidatedIdentityDocument | null> {
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

  let sanitizedBody = buffer;
  if (detected.contentType === "application/pdf") {
    const pdfText = buffer.toString("latin1");
    if (!/%%EOF\s*$/.test(pdfText) || ACTIVE_PDF_TOKENS.test(pdfText)) {
      return null;
    }
  } else {
    const { sanitizeImage } = await import("@/lib/media/image");
    const sanitized = await sanitizeImage(buffer, detected.contentType);
    if (!sanitized) return null;
    sanitizedBody = sanitized.body;
  }

  return {
    ...detected,
    body: sanitizedBody,
    sha256: createHash("sha256").update(sanitizedBody).digest("hex"),
  };
}
