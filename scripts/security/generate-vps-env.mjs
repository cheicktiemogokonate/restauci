import { randomBytes } from "node:crypto";
import { chmod, copyFile, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const template = path.join(root, "deploy/vps/production.env.example");
const destination = path.join(root, "deploy/vps/.env.production");
const localEnvironment = path.join(root, ".env.local");

if (process.argv.includes("--force")) {
  throw new Error(
    "Refus d'écraser automatiquement des secrets existants. Supprimez ou archivez explicitement le fichier cible.",
  );
}

try {
  await readFile(destination, "utf8");
  throw new Error(
    "deploy/vps/.env.production existe déjà ; aucun secret n'a été modifié.",
  );
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

await copyFile(template, destination, 0);
let content = await readFile(destination, "utf8");
const randomBase64 = (bytes) => randomBytes(bytes).toString("base64");
const values = {
  JWT_SECRET: randomBase64(48),
  CRON_SECRET: randomBase64(48),
  NEXT_SERVER_ACTIONS_ENCRYPTION_KEY: randomBase64(32),
  REDIS_HTTP_TOKEN: randomBase64(48),
  VALKEY_PASSWORD: randomBase64(48),
};

function setEnvironmentValue(source, key, value) {
  const lines = source.split("\n");
  const expression = new RegExp(`^(?:#\\s*)?${key}=.*$`);
  const index = lines.findIndex((line) => expression.test(line));
  const replacement = `${key}=${value}`;
  if (index === -1) lines.push(replacement);
  else lines[index] = replacement;
  return lines.join("\n");
}

function parseEnvironmentFile(source) {
  const parsed = new Map();
  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 1) continue;
    const key = trimmed.slice(0, separator);
    const value = trimmed
      .slice(separator + 1)
      .trim()
      .replace(/^(['"])(.*)\1$/, "$2");
    parsed.set(key, value);
  }
  return parsed;
}

for (const [key, value] of Object.entries(values)) {
  content = setEnvironmentValue(content, key, value);
}
content = setEnvironmentValue(
  content,
  "UPSTASH_REDIS_REST_TOKEN",
  values.REDIS_HTTP_TOKEN,
);

// Réutilise uniquement les paramètres portables déjà configurés. Les secrets
// de session/cron sont volontairement renouvelés et le TOTP admin n'est jamais
// copié automatiquement. L'activation MFA du modèle reste sécurisée par défaut.
try {
  const localValues = parseEnvironmentFile(
    await readFile(localEnvironment, "utf8"),
  );
  const portableKeys = [
    "DATABASE_URL",
    "DATABASE_RUNTIME_ROLE",
    "NEXT_PUBLIC_APP_NAME",
    "MOBILE_APP_PAYMENT_RETURN_URL",
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET_NAME",
    "R2_PUBLIC_URL",
    "R2_KYC_BUCKET_NAME",
    "R2_KYC_ACCESS_KEY_ID",
    "R2_KYC_SECRET_ACCESS_KEY",
    "KYC_STORAGE_ENDPOINT",
    "KYC_STORAGE_REGION",
    "KYC_STORAGE_ACCESS_KEY_ID",
    "KYC_STORAGE_SECRET_ACCESS_KEY",
    "KYC_STORAGE_BUCKET",
    "KYC_STORAGE_FORCE_PATH_STYLE",
    "PAYSTACK_SECRET_KEY",
    "VAPID_PUBLIC_KEY",
    "VAPID_PRIVATE_KEY",
    "VAPID_EMAIL",
    "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
    "EXPO_ACCESS_TOKEN",
    "WEB_PUSH_ALLOWED_HOSTS",
    "RESTAURANT_GEO_POLICY_MODE",
    "RESIDENCE_GEO_POLICY_MODE",
    "EVENT_GEO_POLICY_MODE",
  ];
  for (const key of portableKeys) {
    const value = localValues.get(key);
    if (value) content = setEnvironmentValue(content, key, value);
  }

  const currentAppUrl = localValues.get("NEXT_PUBLIC_APP_URL");
  if (currentAppUrl) {
    const url = new URL(currentAppUrl);
    if (url.protocol === "https:" && !url.hostname.endsWith(".localhost")) {
      content = setEnvironmentValue(content, "NEXT_PUBLIC_APP_URL", url.origin);
      content = setEnvironmentValue(content, "APP_DOMAIN", url.hostname);
    }
  }
  const vapidEmail = localValues.get("VAPID_EMAIL")?.replace(/^mailto:/, "");
  if (vapidEmail?.includes("@")) {
    content = setEnvironmentValue(content, "ACME_EMAIL", vapidEmail);
  }
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

await writeFile(destination, content, { encoding: "utf8", mode: 0o600 });
await chmod(destination, 0o600);
console.log(
  "deploy/vps/.env.production créé (mode 0600). Vérifiez le domaine et le stockage KYC ; ADMIN_MFA_REQUIRED=true bloque les connexions admin tant que le secret TOTP n'est pas renseigné.",
);
