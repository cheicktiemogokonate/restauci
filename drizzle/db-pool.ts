import { readFileSync } from "fs";
import { resolve } from "path";
import { Pool } from "pg";

function getDatabaseUrl() {
  const isTestDatabase = process.env.TEST_DATABASE === "true";
  const environmentTestUrl =
    process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL_TEST;
  let developmentFileUrl: string | undefined;
  try {
    const envFile = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of envFile.split(/\r?\n/)) {
      const match = line.trim().match(/^DATABASE_URL=(.*)$/);
      if (match) {
        developmentFileUrl = match[1].trim().replace(/^(['"])(.*)\1$/, "$2");
        break;
      }
    }
  } catch {
    // Le fichier local est optionnel lorsque DATABASE_URL est injectée.
  }
  const developmentUrl = isTestDatabase
    ? developmentFileUrl
    : process.env.DATABASE_URL ?? developmentFileUrl;

  if (isTestDatabase && environmentTestUrl) {
    if (developmentUrl && environmentTestUrl === developmentUrl) {
      throw new Error("La base de test doit être distincte de la base de développement");
    }
    return environmentTestUrl;
  }
  if (!isTestDatabase && process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  let selectedEnvFile: string | undefined;
  try {
    const envPath = isTestDatabase ? ".env.test.local" : ".env.local";
    selectedEnvFile = readFileSync(resolve(process.cwd(), envPath), "utf8");
  } catch {
    // L'environnement de déploiement peut fournir les variables directement.
  }
  if (selectedEnvFile) {
    const expectedKeys = isTestDatabase
      ? new Set(["TEST_DATABASE_URL", "DATABASE_URL_TEST"])
      : new Set(["DATABASE_URL"]);
    for (const line of selectedEnvFile.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const separator = trimmed.indexOf("=");
      if (separator < 1 || !expectedKeys.has(trimmed.slice(0, separator))) {
        continue;
      }

      const rawValue = trimmed.slice(separator + 1).trim();
      const resolved = rawValue.replace(/^(['"])(.*)\1$/, "$2");
      if (isTestDatabase && developmentUrl === resolved) {
        throw new Error("La base de test doit être distincte de la base de développement");
      }
      return resolved;
    }
  }

  throw new Error(
    isTestDatabase
      ? "TEST_DATABASE_URL manquante : refus de retomber sur DATABASE_URL"
      : "DATABASE_URL manquante pour les migrations",
  );
}

export const migrationPool = new Pool({
  connectionString: getDatabaseUrl(),
});
