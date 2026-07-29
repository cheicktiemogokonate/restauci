export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

type AcceptedImageType = (typeof ACCEPTED_IMAGE_TYPES)[number];

export interface ValidatedImage {
  contentType: AcceptedImageType;
  extension: "jpg" | "png" | "webp";
}

function hasBytes(
  buffer: Uint8Array,
  offset: number,
  expected: readonly number[],
) {
  return expected.every((byte, index) => buffer[offset + index] === byte);
}

export function detectImageType(buffer: Uint8Array): ValidatedImage | null {
  if (
    buffer.length >= 3 &&
    hasBytes(buffer, 0, [0xff, 0xd8, 0xff])
  ) {
    return { contentType: "image/jpeg", extension: "jpg" };
  }

  if (
    buffer.length >= 8 &&
    hasBytes(buffer, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  ) {
    return { contentType: "image/png", extension: "png" };
  }

  if (
    buffer.length >= 12 &&
    hasBytes(buffer, 0, [0x52, 0x49, 0x46, 0x46]) &&
    hasBytes(buffer, 8, [0x57, 0x45, 0x42, 0x50])
  ) {
    return { contentType: "image/webp", extension: "webp" };
  }

  return null;
}

export function validateImageType(
  buffer: Uint8Array,
  declaredType: string,
): ValidatedImage | null {
  const detected = detectImageType(buffer);
  return detected?.contentType === declaredType ? detected : null;
}
