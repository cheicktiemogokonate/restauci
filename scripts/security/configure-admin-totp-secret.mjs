import { randomBytes } from "node:crypto";
import { chmod, readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const BASE32_PATTERN = /^[A-Z2-7]{26,128}$/;
const LEGACY_HEX_PATTERN = /^[A-F0-9]{40}$/;
const VERCEL_CLI_VERSION = "59.10.0";

function encodeBase32(bytes) {
  let accumulator = 0;
  let bits = 0;
  let encoded = "";

  for (const byte of bytes) {
    accumulator = (accumulator << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      bits -= 5;
      encoded += BASE32_ALPHABET[(accumulator >>> bits) & 31];
    }
  }

  if (bits > 0) {
    encoded += BASE32_ALPHABET[(accumulator << (5 - bits)) & 31];
  }

  return encoded;
}

function normalizeSecret(value) {
  const normalized = value.trim().toUpperCase();
  if (BASE32_PATTERN.test(normalized)) {
    return { secret: normalized, source: "base32" };
  }
  if (LEGACY_HEX_PATTERN.test(normalized)) {
    return {
      secret: encodeBase32(Buffer.from(normalized, "hex")),
      source: "legacy-hex",
    };
  }
  if (!normalized) {
    return { secret: encodeBase32(randomBytes(20)), source: "generated" };
  }
  throw new Error(
    "ADMIN_TOTP_SECRET est présent mais n'est ni un Base32 valide ni l'ancien format hexadécimal de 40 caractères.",
  );
}

function replaceEnvironmentValue(source, key, value) {
  const lines = source.split(/\r?\n/);
  const expression = new RegExp(`^\\s*${key}=`);
  const matchingIndexes = [];

  lines.forEach((line, index) => {
    if (expression.test(line)) matchingIndexes.push(index);
  });

  if (matchingIndexes.length > 1) {
    throw new Error(`${key} est défini plusieurs fois dans .env.local.`);
  }

  const replacement = `${key}=${value}`;
  if (matchingIndexes.length === 0) lines.push(replacement);
  else lines[matchingIndexes[0]] = replacement;

  return lines.join("\n");
}

function readEnvironmentValue(source, key) {
  const line = source
    .split(/\r?\n/)
    .find((candidate) => new RegExp(`^\\s*${key}=`).test(candidate));
  if (!line) return "";
  return line
    .slice(line.indexOf("=") + 1)
    .trim()
    .replace(/^(['"])(.*)\1$/, "$2");
}

function syncVercelProduction(secret) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "npx",
      [
        "--yes",
        `vercel@${VERCEL_CLI_VERSION}`,
        "env",
        "add",
        "ADMIN_TOTP_SECRET",
        "production",
        "--force",
        "--sensitive",
        "--yes",
      ],
      {
        cwd: process.cwd(),
        env: { ...process.env, NO_COLOR: "1" },
        shell: false,
        stdio: ["pipe", "pipe", "pipe"],
      },
    );

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
    child.stdin.end(secret);
  });
}

const environmentPath = path.join(process.cwd(), ".env.local");
const currentContent = await readFile(environmentPath, "utf8");
const currentSecret = readEnvironmentValue(
  currentContent,
  "ADMIN_TOTP_SECRET",
);
const { secret, source } = normalizeSecret(currentSecret);

if (!BASE32_PATTERN.test(secret)) {
  throw new Error("La normalisation n'a pas produit un secret Base32 valide.");
}

const nextContent = replaceEnvironmentValue(
  currentContent,
  "ADMIN_TOTP_SECRET",
  secret,
);
if (nextContent !== currentContent) {
  await writeFile(environmentPath, nextContent, {
    encoding: "utf8",
    mode: 0o600,
  });
}
await chmod(environmentPath, 0o600);

const sourceMessages = {
  base32: "déjà valide",
  "legacy-hex": "ancien format hexadécimal converti en Base32",
  generated: "nouveau secret Base32 généré",
};
console.log(
  `ADMIN_TOTP_SECRET local configuré (${sourceMessages[source]}, valeur masquée).`,
);

if (process.argv.includes("--sync-vercel-production")) {
  await syncVercelProduction(secret);
  console.log(
    "ADMIN_TOTP_SECRET synchronisé comme secret sensible dans Vercel Production (valeur masquée).",
  );
}
