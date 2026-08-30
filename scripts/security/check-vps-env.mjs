import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const environmentPath = path.resolve(
  process.argv[2] ?? "deploy/vps/.env.production",
);

function parseEnvironmentFile(source) {
  const parsed = new Map();
  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 1) continue;
    parsed.set(
      trimmed.slice(0, separator),
      trimmed.slice(separator + 1).trim().replace(/^(['"])(.*)\1$/, "$2"),
    );
  }
  return parsed;
}

function requireValue(values, key) {
  const value = values.get(key);
  if (!value || value.startsWith("__")) throw new Error(`${key} manquant.`);
  return value;
}

const metadata = await stat(environmentPath);
if ((metadata.mode & 0o077) !== 0) {
  throw new Error("Le fichier VPS doit être inaccessible au groupe et aux autres (mode 0600)." );
}
const values = parseEnvironmentFile(await readFile(environmentPath, "utf8"));
if (values.has("DATABASE_MIGRATION_URL")) {
  throw new Error("DATABASE_MIGRATION_URL ne doit jamais être injectée dans le runtime VPS.");
}
if (requireValue(values, "NODE_ENV") !== "production") {
  throw new Error("NODE_ENV doit valoir production.");
}
const adminMfaSetting = requireValue(values, "ADMIN_MFA_REQUIRED");
if (adminMfaSetting !== "true" && adminMfaSetting !== "false") {
  throw new Error("ADMIN_MFA_REQUIRED doit valoir true ou false.");
}
const adminMfaRequired = adminMfaSetting === "true";

const databaseUrl = new URL(requireValue(values, "DATABASE_URL"));
const databaseRole = decodeURIComponent(databaseUrl.username);
const expectedRole = requireValue(values, "DATABASE_RUNTIME_ROLE");
if (databaseRole !== expectedRole || /owner|admin|postgres/i.test(databaseRole)) {
  throw new Error("DATABASE_URL n'utilise pas le rôle runtime attendu.");
}

const appUrl = new URL(requireValue(values, "NEXT_PUBLIC_APP_URL"));
if (
  appUrl.protocol !== "https:" ||
  appUrl.hostname !== requireValue(values, "APP_DOMAIN")
) {
  throw new Error("APP_DOMAIN et NEXT_PUBLIC_APP_URL HTTPS ne correspondent pas.");
}

const secretKeys = [
  "JWT_SECRET",
  "CRON_SECRET",
  "REDIS_HTTP_TOKEN",
  "VALKEY_PASSWORD",
];
const secrets = secretKeys.map((key) => requireValue(values, key));
if (secrets.some((secret) => secret.length < 32)) {
  throw new Error("Un secret VPS généré contient moins de 32 caractères.");
}
if (new Set(secrets).size !== secrets.length) {
  throw new Error("Les secrets VPS doivent être distincts.");
}
const actionsKey = Buffer.from(
  requireValue(values, "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY"),
  "base64",
);
if (actionsKey.length !== 32) {
  throw new Error("NEXT_SERVER_ACTIONS_ENCRYPTION_KEY doit décoder vers 32 octets.");
}
if (
  requireValue(values, "UPSTASH_REDIS_REST_URL") !==
    "http://redis-http:8080" ||
  requireValue(values, "UPSTASH_REDIS_REST_TOKEN") !==
    requireValue(values, "REDIS_HTTP_TOKEN")
) {
  throw new Error("Le bridge REST Valkey est incohérent.");
}

const genericStorage = [
  "KYC_STORAGE_ENDPOINT",
  "KYC_STORAGE_ACCESS_KEY_ID",
  "KYC_STORAGE_SECRET_ACCESS_KEY",
  "KYC_STORAGE_BUCKET",
].every((key) => values.has(key) && values.get(key));
const legacyR2Storage = [
  "R2_ACCOUNT_ID",
  "R2_KYC_ACCESS_KEY_ID",
  "R2_KYC_SECRET_ACCESS_KEY",
  "R2_KYC_BUCKET_NAME",
].every((key) => values.has(key) && values.get(key));
if (!genericStorage && !legacyR2Storage) {
  throw new Error("Aucun stockage KYC privé complet n'est configuré.");
}
if (
  requireValue(values, "CLAMAV_HOST") !== "127.0.0.1" ||
  requireValue(values, "CLAMAV_PORT") !== "3310"
) {
  throw new Error("ClamAV doit rester lié à loopback sur le VPS mono-hôte.");
}

console.log(JSON.stringify({
  status: adminMfaRequired
    ? values.has("ADMIN_TOTP_SECRET")
      ? "ready"
      : "ready_except_admin_totp"
    : "ready_admin_mfa_temporarily_disabled",
  adminMfaRequired,
  databaseRole,
  kycStorage: genericStorage ? "s3-compatible" : "r2-private",
  secretsFileMode: (metadata.mode & 0o777).toString(8).padStart(4, "0"),
}));
