import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const image = process.argv[2] ?? "toutci-app:latest";
const environmentPath =
  process.argv[3] ?? path.join("deploy", "vps", ".env.production");

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: options.quiet ? "ignore" : ["ignore", "pipe", "pipe"],
      shell: false,
    });
    let diagnostics = "";
    if (!options.quiet) {
      const collect = (chunk) => {
        if (diagnostics.length < 8_192) diagnostics += chunk.toString("utf8");
      };
      child.stdout.on("data", collect);
      child.stderr.on("data", collect);
    }
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, diagnostics }));
  });
}

function sensitiveValues(source) {
  const ignored = new Set([
    // Next.js documente que cette clé est intégrée au build pour permettre
    // le chiffrement cohérent des Server Actions entre instances.
    "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY",
  ]);
  const values = [];
  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 1) continue;
    const key = trimmed.slice(0, separator);
    if (
      ignored.has(key) ||
      key.startsWith("NEXT_PUBLIC_") ||
      !/(?:SECRET|TOKEN|PASSWORD|DATABASE_URL|ACCESS_KEY|PRIVATE_KEY)/.test(key)
    ) {
      continue;
    }
    const value = trimmed
      .slice(separator + 1)
      .trim()
      .replace(/^(['"])(.*)\1$/, "$2");
    if (value.length >= 8 && !value.startsWith("__")) values.push(value);
  }
  return [...new Set(values)];
}

const temporaryDirectory = await mkdtemp(
  path.join(os.tmpdir(), "toutci-image-secret-scan-"),
);
const containerName = `toutci-secret-scan-${randomUUID().slice(0, 12)}`;
let created = false;

try {
  const secrets = sensitiveValues(await readFile(environmentPath, "utf8"));
  if (secrets.length === 0) throw new Error("Aucun secret testable trouvé.");
  const patternsPath = path.join(temporaryDirectory, "patterns.txt");
  const rootPath = path.join(temporaryDirectory, "rootfs");
  const archivePath = path.join(temporaryDirectory, "rootfs.tar");
  await writeFile(patternsPath, `${secrets.join("\n")}\n`, { mode: 0o600 });
  await mkdir(rootPath, { mode: 0o700 });

  let result = await run("docker", ["create", "--name", containerName, image]);
  if (result.code !== 0) throw new Error(`docker create a échoué: ${result.diagnostics}`);
  created = true;
  result = await run("docker", ["export", "--output", archivePath, containerName]);
  if (result.code !== 0) throw new Error(`docker export a échoué: ${result.diagnostics}`);
  result = await run("tar", ["-xf", archivePath, "-C", rootPath]);
  if (result.code !== 0) throw new Error(`Extraction de l'image échouée: ${result.diagnostics}`);
  result = await run(
    "rg",
    ["--hidden", "--text", "--fixed-strings", "--quiet", "--file", patternsPath, rootPath],
    { quiet: true },
  );
  if (result.code === 0) {
    throw new Error("Un secret runtime a été trouvé dans le système de fichiers de l'image.");
  }
  if (result.code !== 1) throw new Error("Le scan rg de l'image a échoué.");
  console.log(
    `Image ${image} vérifiée : aucun des ${secrets.length} secrets runtime testés n'est intégré au système de fichiers.`,
  );
} finally {
  if (created) await run("docker", ["rm", "-f", containerName], { quiet: true });
  await rm(temporaryDirectory, { recursive: true, force: true });
}
