import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

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

function runVercel(args, value) {
  return new Promise((resolve, reject) => {
    const child = spawn("npx", ["--yes", "vercel@latest", ...args], {
      cwd: process.cwd(),
      env: { ...process.env, NO_COLOR: "1" },
      shell: false,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let diagnostics = "";
    const collect = (chunk) => {
      if (diagnostics.length < 16_384) diagnostics += chunk.toString("utf8");
    };
    child.stdout.on("data", collect);
    child.stderr.on("data", collect);
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Vercel CLI a échoué (${code}): ${diagnostics}`));
    });
    child.stdin.end(value);
  });
}

const root = process.cwd();
const localValues = parseEnvironmentFile(
  await readFile(path.join(root, ".env.local"), "utf8"),
);
const vpsValues = parseEnvironmentFile(
  await readFile(path.join(root, "deploy/vps/.env.production"), "utf8"),
);
const variables = new Map([
  ["DATABASE_URL", localValues.get("DATABASE_URL")],
  ["DATABASE_RUNTIME_ROLE", localValues.get("DATABASE_RUNTIME_ROLE")],
  ["JWT_SECRET", vpsValues.get("JWT_SECRET")],
  ["ADMIN_MFA_REQUIRED", vpsValues.get("ADMIN_MFA_REQUIRED")],
  ["CRON_SECRET", vpsValues.get("CRON_SECRET")],
  [
    "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY",
    vpsValues.get("NEXT_SERVER_ACTIONS_ENCRYPTION_KEY"),
  ],
  ["R2_KYC_BUCKET_NAME", localValues.get("R2_KYC_BUCKET_NAME")],
  ["R2_KYC_ACCESS_KEY_ID", localValues.get("R2_KYC_ACCESS_KEY_ID")],
  ["R2_KYC_SECRET_ACCESS_KEY", localValues.get("R2_KYC_SECRET_ACCESS_KEY")],
  ["DATA_CACHE_ENABLED", vpsValues.get("DATA_CACHE_ENABLED")],
  [
    "RESTAURANT_GEO_POLICY_MODE",
    vpsValues.get("RESTAURANT_GEO_POLICY_MODE"),
  ],
  ["RESIDENCE_GEO_POLICY_MODE", vpsValues.get("RESIDENCE_GEO_POLICY_MODE")],
  ["EVENT_GEO_POLICY_MODE", vpsValues.get("EVENT_GEO_POLICY_MODE")],
]);

if (variables.has("ADMIN_TOTP_SECRET") || variables.has("DATABASE_MIGRATION_URL")) {
  throw new Error("Une variable interdite a été incluse dans la synchronisation.");
}
for (const [key, value] of variables) {
  if (!value) throw new Error(`${key} manque dans les fichiers locaux.`);
}
const databaseUrl = new URL(variables.get("DATABASE_URL"));
if (
  decodeURIComponent(databaseUrl.username) !==
    variables.get("DATABASE_RUNTIME_ROLE") ||
  /owner|admin|postgres/i.test(databaseUrl.username)
) {
  throw new Error("Refus de synchroniser un compte PostgreSQL privilégié.");
}

if (!process.argv.includes("--apply")) {
  console.log(
    `Dry-run : ${variables.size} variables de sécurité prêtes pour Vercel Production (ADMIN_TOTP_SECRET exclu ; MFA=${variables.get("ADMIN_MFA_REQUIRED")}).`,
  );
  process.exit(0);
}

for (const [key, value] of variables) {
  await runVercel(
    [
      "env",
      "add",
      key,
      "production",
      "--force",
      "--sensitive",
      "--yes",
    ],
    value,
  );
  console.log(`${key}: synchronisée en Production (valeur masquée).`);
}
