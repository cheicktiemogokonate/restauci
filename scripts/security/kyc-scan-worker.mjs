import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import pg from "pg";

const { Client } = pg;
const MAX_INPUT_BYTES = 8 * 1024 * 1024;
const MAX_CLEAN_BYTES = 32 * 1024 * 1024;
const databaseUrl = process.env.DATABASE_URL;
const maxAttempts = Number(process.env.KYC_SCAN_MAX_ATTEMPTS ?? "3");
const pollMs = Number(process.env.KYC_SCAN_POLL_MS ?? "5000");
const clamavHost = process.env.CLAMAV_HOST ?? "127.0.0.1";
const clamavPort = Number(process.env.CLAMAV_PORT ?? "3310");
const dangerzoneCli = process.env.DANGERZONE_CLI_PATH ?? "dangerzone-cli";

if (!databaseUrl) throw new Error("DATABASE_URL manquante pour le worker KYC.");
if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 10) {
  throw new Error("KYC_SCAN_MAX_ATTEMPTS doit être compris entre 1 et 10.");
}
if (!Number.isInteger(pollMs) || pollMs < 1_000 || pollMs > 60_000) {
  throw new Error("KYC_SCAN_POLL_MS doit être compris entre 1000 et 60000.");
}
if (!Number.isInteger(clamavPort) || clamavPort < 1 || clamavPort > 65_535) {
  throw new Error("CLAMAV_PORT invalide.");
}

function storageConfig() {
  if (
    process.env.KYC_STORAGE_ENDPOINT &&
    process.env.KYC_STORAGE_ACCESS_KEY_ID &&
    process.env.KYC_STORAGE_SECRET_ACCESS_KEY &&
    process.env.KYC_STORAGE_BUCKET
  ) {
    return {
      endpoint: process.env.KYC_STORAGE_ENDPOINT,
      region: process.env.KYC_STORAGE_REGION ?? "auto",
      accessKeyId: process.env.KYC_STORAGE_ACCESS_KEY_ID,
      secretAccessKey: process.env.KYC_STORAGE_SECRET_ACCESS_KEY,
      bucket: process.env.KYC_STORAGE_BUCKET,
      forcePathStyle: process.env.KYC_STORAGE_FORCE_PATH_STYLE === "true",
    };
  }
  if (
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_KYC_ACCESS_KEY_ID &&
    process.env.R2_KYC_SECRET_ACCESS_KEY &&
    process.env.R2_KYC_BUCKET_NAME
  ) {
    return {
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      region: "auto",
      accessKeyId: process.env.R2_KYC_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_KYC_SECRET_ACCESS_KEY,
      bucket: process.env.R2_KYC_BUCKET_NAME,
      forcePathStyle: false,
    };
  }
  throw new Error("Stockage KYC S3-compatible non configuré.");
}

const storage = storageConfig();
const s3 = new S3Client({
  endpoint: storage.endpoint,
  region: storage.region,
  forcePathStyle: storage.forcePathStyle,
  credentials: {
    accessKeyId: storage.accessKeyId,
    secretAccessKey: storage.secretAccessKey,
  },
});

function sha256(body) {
  return createHash("sha256").update(body).digest("hex");
}

async function deleteQuarantinedObjectBestEffort(document) {
  try {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: storage.bucket,
        Key: document.storage_key,
      }),
    );
  } catch (error) {
    console.error(JSON.stringify({
      event: "kyc_quarantine_cleanup_failed",
      documentId: document.id,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    }));
  }
}

async function readQuarantinedObject(key) {
  const response = await s3.send(
    new GetObjectCommand({ Bucket: storage.bucket, Key: key }),
  );
  if (!response.Body) throw new Error("Objet KYC vide.");
  const body = Buffer.from(await response.Body.transformToByteArray());
  if (body.length === 0 || body.length > MAX_INPUT_BYTES) {
    throw new Error("Taille de l'objet KYC invalide.");
  }
  return body;
}

async function clamavScan(body) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: clamavHost, port: clamavPort });
    const response = [];
    let responseSize = 0;
    let settled = false;
    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      socket.destroy();
      if (error) reject(error);
      else resolve(result);
    };
    const timeout = setTimeout(
      () => finish(new Error("Timeout ClamAV.")),
      30_000,
    );
    socket.on("connect", () => {
      socket.write(Buffer.from("zINSTREAM\0"));
      for (let offset = 0; offset < body.length; offset += 64 * 1024) {
        const chunk = body.subarray(offset, offset + 64 * 1024);
        const length = Buffer.alloc(4);
        length.writeUInt32BE(chunk.length);
        socket.write(length);
        socket.write(chunk);
      }
      socket.write(Buffer.alloc(4));
    });
    socket.on("data", (chunk) => {
      responseSize += chunk.length;
      if (responseSize > 4_096) {
        finish(new Error("Réponse ClamAV trop volumineuse."));
        return;
      }
      response.push(chunk);
      const text = Buffer.concat(response).toString("utf8");
      if (!text.includes("\0") && !text.includes("\n")) return;
      const normalized = text.replace(/[\0\r\n]+$/g, "").trim();
      if (normalized.endsWith(" OK")) {
        finish(null, { clean: true, result: "OK" });
      } else if (normalized.endsWith(" FOUND")) {
        const signature = normalized
          .replace(/^.*?:\s*/, "")
          .replace(/\s+FOUND$/, "")
          .slice(0, 200);
        finish(null, { clean: false, result: signature || "FOUND" });
      } else {
        finish(new Error(`Réponse ClamAV inattendue: ${normalized.slice(0, 200)}`));
      }
    });
    socket.on("error", (error) => finish(error));
    socket.on("end", () => {
      if (!settled) finish(new Error("Connexion ClamAV fermée sans résultat."));
    });
  });
}

async function runDangerzone(input) {
  const temporaryDirectory = await mkdtemp(
    path.join(os.tmpdir(), "toutci-kyc-cdr-"),
  );
  const inputPath = path.join(temporaryDirectory, "input.pdf");
  const outputPath = path.join(temporaryDirectory, "safe.pdf");
  try {
    await writeFile(inputPath, input, { mode: 0o600 });
    await new Promise((resolve, reject) => {
      const child = spawn(
        dangerzoneCli,
        ["--output-filename", outputPath, inputPath],
        {
          cwd: temporaryDirectory,
          shell: false,
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      let diagnostics = "";
      const collect = (chunk) => {
        if (diagnostics.length < 4_096) diagnostics += chunk.toString("utf8");
      };
      child.stdout.on("data", collect);
      child.stderr.on("data", collect);
      const timeout = setTimeout(() => child.kill("SIGKILL"), 180_000);
      child.on("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      child.on("close", (code) => {
        clearTimeout(timeout);
        if (code === 0) resolve();
        else reject(new Error(`Dangerzone a échoué (${code}): ${diagnostics.slice(-1_000)}`));
      });
    });
    const safe = await readFile(outputPath);
    if (
      safe.length === 0 ||
      safe.length > MAX_CLEAN_BYTES ||
      !safe.subarray(0, 5).equals(Buffer.from("%PDF-")) ||
      !/%%EOF\s*$/.test(safe.toString("latin1"))
    ) {
      throw new Error("Le PDF assaini produit par Dangerzone est invalide.");
    }
    return safe;
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

async function claimDocument(client) {
  const result = await client.query(
    `WITH candidate AS (
       SELECT id
         FROM partner_identity_documents
        WHERE scan_attempts < $1
          AND (
            scan_status = 'pending'
            OR (scan_status = 'error' AND scan_completed_at < now() - interval '5 minutes')
            OR (scan_status = 'processing' AND scan_started_at < now() - interval '15 minutes')
          )
        ORDER BY uploaded_at, id
        FOR UPDATE SKIP LOCKED
        LIMIT 1
     )
     UPDATE partner_identity_documents AS document
        SET scan_status = 'processing',
            scan_attempts = scan_attempts + 1,
            scan_started_at = now(),
            scan_completed_at = NULL,
            scan_engine = NULL,
            scan_result = NULL,
            last_scan_error = NULL,
            clean_storage_key = NULL,
            clean_content_type = NULL,
            clean_size_bytes = NULL,
            clean_sha256 = NULL
       FROM candidate
      WHERE document.id = candidate.id
      RETURNING document.id,
                document.verification_id,
                document.storage_key,
                document.content_type,
                document.sha256,
                document.scan_attempts`,
    [maxAttempts],
  );
  return result.rows[0] ?? null;
}

async function markRejected(client, document, result) {
  await client.query(
    `UPDATE partner_identity_documents
        SET scan_status = 'rejected',
            scan_completed_at = now(),
            scan_engine = 'clamav',
            scan_result = $3,
            last_scan_error = NULL
      WHERE id = $1 AND storage_key = $2 AND scan_status = 'processing'`,
    [document.id, document.storage_key, result.slice(0, 255)],
  );
}

async function markError(client, document, error) {
  const message = error instanceof Error ? error.message : "Erreur inconnue";
  await client.query(
    `UPDATE partner_identity_documents
        SET scan_status = 'error',
            scan_completed_at = now(),
            scan_engine = 'clamav+dangerzone',
            scan_result = 'scan_error',
            last_scan_error = $3,
            clean_storage_key = NULL,
            clean_content_type = NULL,
            clean_size_bytes = NULL,
            clean_sha256 = NULL
      WHERE id = $1 AND storage_key = $2 AND scan_status = 'processing'`,
    [document.id, document.storage_key, message.slice(0, 2_000)],
  );
}

function scanEngineFor(document) {
  return document.content_type === "application/pdf"
    ? "clamav+dangerzone"
    : "clamav+image-reencode";
}

async function processDocument(client, document) {
  const original = await readQuarantinedObject(document.storage_key);
  if (sha256(original) !== document.sha256) {
    throw new Error("Le checksum de l'objet en quarantaine ne correspond pas.");
  }

  const firstScan = await clamavScan(original);
  if (!firstScan.clean) {
    await markRejected(client, document, `malware:${firstScan.result}`);
    await deleteQuarantinedObjectBestEffort(document);
    return "rejected";
  }

  const isPdf = document.content_type === "application/pdf";
  const cleanBody = isPdf ? await runDangerzone(original) : original;
  const secondScan = await clamavScan(cleanBody);
  if (!secondScan.clean) {
    await markRejected(client, document, `post-cdr-malware:${secondScan.result}`);
    await deleteQuarantinedObjectBestEffort(document);
    return "rejected";
  }

  const cleanContentType = isPdf ? "application/pdf" : document.content_type;
  const extension =
    cleanContentType === "application/pdf"
      ? "pdf"
      : cleanContentType === "image/png"
        ? "png"
        : "jpg";
  const cleanKey = [
    "identity",
    "clean",
    document.verification_id,
    `${document.id}-${randomUUID()}.${extension}`,
  ].join("/");

  await s3.send(
    new PutObjectCommand({
      Bucket: storage.bucket,
      Key: cleanKey,
      Body: cleanBody,
      ContentType: cleanContentType,
      ContentDisposition: "attachment",
      CacheControl: "private, no-store, max-age=0",
    }),
  );

  const updated = await client.query(
    `UPDATE partner_identity_documents
        SET scan_status = 'clean',
            clean_storage_key = $3,
            clean_content_type = $4,
            clean_size_bytes = $5,
            clean_sha256 = $6,
            scan_completed_at = now(),
            scan_engine = $7,
            scan_result = 'clean',
            last_scan_error = NULL
      WHERE id = $1 AND storage_key = $2 AND scan_status = 'processing'
      RETURNING id`,
    [
      document.id,
      document.storage_key,
      cleanKey,
      cleanContentType,
      cleanBody.length,
      sha256(cleanBody),
      scanEngineFor(document),
    ],
  );
  if (updated.rowCount !== 1) {
    await s3.send(
      new DeleteObjectCommand({ Bucket: storage.bucket, Key: cleanKey }),
    );
    throw new Error("Le document a été remplacé pendant son analyse.");
  }
  await deleteQuarantinedObjectBestEffort(document);
  return "clean";
}

async function processOne() {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const document = await claimDocument(client);
    if (!document) return false;
    try {
      const result = await processDocument(client, document);
      console.log(JSON.stringify({
        event: result === "clean" ? "kyc_scan_completed" : "kyc_scan_rejected",
        documentId: document.id,
      }));
    } catch (error) {
      await markError(client, document, error);
      console.error(JSON.stringify({
        event: "kyc_scan_failed",
        documentId: document.id,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      }));
    }
    return true;
  } finally {
    await client.end();
  }
}

if (process.argv.includes("--once")) {
  await processOne();
} else {
  let stopping = false;
  process.on("SIGINT", () => { stopping = true; });
  process.on("SIGTERM", () => { stopping = true; });
  while (!stopping) {
    const processed = await processOne().catch((error) => {
      console.error(JSON.stringify({
        event: "kyc_worker_error",
        error: error instanceof Error ? error.message : "Erreur inconnue",
      }));
      return false;
    });
    if (!processed) await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
}
