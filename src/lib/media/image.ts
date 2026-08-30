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

export interface SanitizedImage extends ValidatedImage {
  body: Buffer;
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

export async function sanitizeImage(
  buffer: Buffer,
  declaredType: string,
): Promise<SanitizedImage | null> {
  const detected = validateImageType(buffer, declaredType);
  if (!detected) return null;

  try {
    const sharp = (await import("sharp")).default;
    const image = sharp(buffer, {
      failOn: "warning",
      limitInputPixels: 40_000_000,
      sequentialRead: true,
    });
    const metadata = await image.metadata();
    const expectedFormat =
      detected.extension === "jpg" ? "jpeg" : detected.extension;

    if (
      metadata.format !== expectedFormat ||
      !metadata.width ||
      !metadata.height ||
      metadata.width * metadata.height > 40_000_000
    ) {
      return null;
    }

    let pipeline = image.rotate().resize({
      width: 4_096,
      height: 4_096,
      fit: "inside",
      withoutEnlargement: true,
    });

    if (detected.extension === "jpg") {
      pipeline = pipeline.jpeg({ quality: 85, mozjpeg: true });
    } else if (detected.extension === "png") {
      pipeline = pipeline.png({ compressionLevel: 9 });
    } else {
      pipeline = pipeline.webp({ quality: 85 });
    }

    const body = await pipeline.toBuffer();
    if (body.length === 0 || body.length > MAX_IMAGE_SIZE) return null;
    return { ...detected, body };
  } catch {
    return null;
  }
}
