import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";

const envFile = readFileSync(".env.test.local", "utf8");
const values = Object.fromEntries(
  envFile.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    return match ? [[match[1], match[2].replace(/^['"]|['"]$/g, "")]] : [];
  }),
);

const testDatabaseUrl = values.TEST_DATABASE_URL ?? values.DATABASE_URL_TEST;
if (!testDatabaseUrl) {
  throw new Error("TEST_DATABASE_URL est requis ; aucun fallback développement n’est autorisé.");
}
let localDevelopmentUrl;
try {
  const developmentFile = readFileSync(".env.local", "utf8");
  localDevelopmentUrl = developmentFile
    .split(/\r?\n/)
    .map((line) => line.match(/^DATABASE_URL=(.*)$/)?.[1]?.replace(/^['"]|['"]$/g, ""))
    .find(Boolean);
} catch {
  // Le fichier local est optionnel lorsque DATABASE_URL est injectée.
}
if (
  testDatabaseUrl === process.env.DATABASE_URL ||
  testDatabaseUrl === localDevelopmentUrl
) {
  // Porte de secours explicite : quand la SEULE base disponible est aussi la
  // base de test (environnements d'évaluation), E2E_ALLOW_SHARED_DB=true
  // autorise le partage. Les specs ne manipulent que les entités seedées
  // (préfixe e2e.) et le seed est idempotent (ON CONFLICT DO UPDATE).
  if (process.env.E2E_ALLOW_SHARED_DB === "true") {
    console.warn(
      "⚠️  E2E_ALLOW_SHARED_DB=true : la suite s'exécute sur la base de développement partagée.",
    );
  } else {
    throw new Error(
      "La base de test doit être distincte de la base de développement (ou E2E_ALLOW_SHARED_DB=true pour un environnement d'évaluation sans base dédiée).",
    );
  }
}

const child = spawn(process.argv[2], process.argv.slice(3), {
  stdio: "inherit",
  env: {
    ...process.env,
    DATABASE_URL: testDatabaseUrl,
    TEST_DATABASE_URL: testDatabaseUrl,
    TEST_DATABASE: "true",
    UPSTASH_REDIS_REST_URL: values.UPSTASH_REDIS_REST_URL_TEST,
    UPSTASH_REDIS_REST_TOKEN: values.UPSTASH_REDIS_REST_TOKEN_TEST,
    JWT_SECRET: values.JWT_SECRET_TEST,
    // Les scénarios E2E valident les droits admin, pas le fournisseur TOTP.
    // Une valeur base32 explicite empêche un placeholder local invalide de
    // bloquer le démarrage de l'environnement de test.
    ADMIN_MFA_REQUIRED: "false",
    ADMIN_TOTP_SECRET: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    NEXT_PUBLIC_APP_URL:
      process.env.E2E_APP_URL ?? "http://127.0.0.1:3100",
    E2E_TEST: "true",
  },
});
child.on("exit", (code) => process.exit(code ?? 1));
