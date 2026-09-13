import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import { env } from "@/infrastructure/env";

type PrivateIdentityContentType =
  | "image/jpeg"
  | "image/png"
  | "application/pdf";

interface PrivateIdentityStorageConfig {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  forcePathStyle: boolean;
}

let privateIdentityClient: S3Client | null = null;

function getPrivateIdentityStorageConfig(): PrivateIdentityStorageConfig | null {
  if (
    env.KYC_STORAGE_ENDPOINT &&
    env.KYC_STORAGE_ACCESS_KEY_ID &&
    env.KYC_STORAGE_SECRET_ACCESS_KEY &&
    env.KYC_STORAGE_BUCKET
  ) {
    return {
      endpoint: env.KYC_STORAGE_ENDPOINT,
      region: env.KYC_STORAGE_REGION,
      accessKeyId: env.KYC_STORAGE_ACCESS_KEY_ID,
      secretAccessKey: env.KYC_STORAGE_SECRET_ACCESS_KEY,
      bucketName: env.KYC_STORAGE_BUCKET,
      forcePathStyle: env.KYC_STORAGE_FORCE_PATH_STYLE,
    };
  }

  const {
    R2_ACCOUNT_ID: accountId,
    R2_KYC_ACCESS_KEY_ID: accessKeyId,
    R2_KYC_SECRET_ACCESS_KEY: secretAccessKey,
    R2_KYC_BUCKET_NAME: bucketName,
  } = env;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    return null;
  }

  return {
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    region: "auto",
    accessKeyId,
    secretAccessKey,
    bucketName,
    forcePathStyle: false,
  };
}

function getPrivateIdentityClient(config: PrivateIdentityStorageConfig) {
  privateIdentityClient ??= new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
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
    "quarantine",
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

export async function putCleanPrivateIdentityDocument(input: {
  documentId: string;
  verificationId: string;
  body: Buffer;
  contentType: PrivateIdentityContentType;
  extension: "jpg" | "png" | "pdf";
}) {
  const config = getPrivateIdentityStorageConfig();
  if (!config) throw new Error("PRIVATE_IDENTITY_STORAGE_NOT_CONFIGURED");
  const key = [
    "identity",
    "clean",
    input.verificationId,
    `${input.documentId}-${randomUUID()}.${input.extension}`,
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
