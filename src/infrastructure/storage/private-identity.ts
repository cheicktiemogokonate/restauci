import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import { env } from "@/lib/env";

type PrivateIdentityContentType =
  | "image/jpeg"
  | "image/png"
  | "application/pdf";

interface PrivateIdentityStorageConfig {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
}

let privateIdentityClient: S3Client | null = null;

function getPrivateIdentityStorageConfig(): PrivateIdentityStorageConfig | null {
  const {
    R2_ACCOUNT_ID: accountId,
    R2_KYC_ACCESS_KEY_ID: accessKeyId,
    R2_KYC_SECRET_ACCESS_KEY: secretAccessKey,
    R2_KYC_BUCKET_NAME: bucketName,
  } = env;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    return null;
  }

  return { accountId, accessKeyId, secretAccessKey, bucketName };
}

function getPrivateIdentityClient(config: PrivateIdentityStorageConfig) {
  privateIdentityClient ??= new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  return privateIdentityClient;
}

export function isPrivateIdentityStorageConfigured() {
  return getPrivateIdentityStorageConfig() !== null;
}

export async function putPrivateIdentityDocument(input: {
  partnerAccountId: string;
  verificationId: string;
  body: Buffer;
  contentType: PrivateIdentityContentType;
  extension: "jpg" | "png" | "pdf";
}) {
  const config = getPrivateIdentityStorageConfig();
  if (!config) throw new Error("PRIVATE_IDENTITY_STORAGE_NOT_CONFIGURED");

  const key = [
    "identity",
    input.partnerAccountId,
    input.verificationId,
    `${randomUUID()}.${input.extension}`,
  ].join("/");

  await getPrivateIdentityClient(config).send(
    new PutObjectCommand({
      Bucket: config.bucketName,
      Key: key,
      Body: input.body,
      ContentType: input.contentType,
      ContentDisposition: "attachment",
      CacheControl: "private, no-store, max-age=0",
    }),
  );

  return { key };
}

export async function readPrivateIdentityDocument(key: string) {
  const config = getPrivateIdentityStorageConfig();
  if (!config) throw new Error("PRIVATE_IDENTITY_STORAGE_NOT_CONFIGURED");

  const result = await getPrivateIdentityClient(config).send(
    new GetObjectCommand({ Bucket: config.bucketName, Key: key }),
  );
  if (!result.Body) throw new Error("PRIVATE_IDENTITY_DOCUMENT_EMPTY");

  return {
    body: Buffer.from(await result.Body.transformToByteArray()),
    contentType: result.ContentType ?? "application/octet-stream",
  };
}

export async function deletePrivateIdentityDocument(key: string) {
  const config = getPrivateIdentityStorageConfig();
  if (!config) return;
  await getPrivateIdentityClient(config).send(
    new DeleteObjectCommand({ Bucket: config.bucketName, Key: key }),
  );
}
