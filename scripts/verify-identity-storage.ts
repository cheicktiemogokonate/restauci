import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_KYC_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_KYC_SECRET_ACCESS_KEY;
const bucket = process.env.R2_KYC_BUCKET_NAME;

if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
  throw new Error("Configuration R2 KYC incomplète");
}

const client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});
const key = `identity/health-check/${crypto.randomUUID()}.txt`;
let created = false;

try {
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: Buffer.from("Toutci KYC private storage check"),
    ContentType: "text/plain",
    CacheControl: "private, no-store",
  }));
  created = true;
  const stored = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const body = await stored.Body?.transformToString();
  if (body !== "Toutci KYC private storage check") {
    throw new Error("Le contenu relu depuis R2 est inattendu");
  }
  console.log(JSON.stringify({ write: true, read: true, cacheControl: stored.CacheControl }));
} finally {
  if (!created) {
    console.log(JSON.stringify({ write: false, read: false, deleted: true }));
    process.exitCode = 1;
  } else {
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  let deleted = false;
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  } catch (error) {
    deleted = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404;
  }
  console.log(JSON.stringify({ deleted }));
  if (!deleted) process.exitCode = 1;
  }
}
