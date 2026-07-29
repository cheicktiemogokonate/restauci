import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import { env } from "@/lib/env";

interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl: string;
}

let client: S3Client | null = null;

function normalizePublicUrl(value: string) {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.hostname.endsWith(".r2.cloudflarestorage.com")
    ) {
      return null;
    }

    return url.toString().replace(/\/+$/, "");
  } catch {
    return null;
  }
}

function getR2Config(): R2Config | null {
  const {
    R2_ACCOUNT_ID: accountId,
    R2_ACCESS_KEY_ID: accessKeyId,
    R2_SECRET_ACCESS_KEY: secretAccessKey,
    R2_BUCKET_NAME: bucketName,
    R2_PUBLIC_URL: publicUrl,
  } = env;

  const normalizedPublicUrl = publicUrl
    ? normalizePublicUrl(publicUrl)
    : null;

  if (
    !accountId ||
    !accessKeyId ||
    !secretAccessKey ||
    !bucketName ||
    !normalizedPublicUrl
  ) {
    return null;
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicUrl: normalizedPublicUrl,
  };
}

export function isR2Configured() {
  return getR2Config() !== null;
}

function getR2Client(config: R2Config) {
  client ??= new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return client;
}

export async function uploadImageToR2({
  body,
  contentType,
  extension,
  ownerId,
}: {
  body: Buffer;
  contentType: string;
  extension: string;
  ownerId: string;
}) {
  const config = getR2Config();
  if (!config) {
    throw new Error("R2_NOT_CONFIGURED");
  }

  const now = new Date();
  const key = [
    "restaurants",
    ownerId,
    String(now.getUTCFullYear()),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    `${randomUUID()}.${extension}`,
  ].join("/");

  await getR2Client(config).send(
    new PutObjectCommand({
      Bucket: config.bucketName,
      Key: key,
      Body: body,
      ContentType: contentType,
      ContentDisposition: "inline",
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  return {
    key,
    url: `${config.publicUrl}/${key}`,
  };
}
