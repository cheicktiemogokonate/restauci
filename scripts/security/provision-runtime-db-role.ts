import { randomBytes } from "node:crypto";
import {
  chmodSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { Client } from "pg";

const envPath = resolve(process.cwd(), ".env.local");
const roleArgumentIndex = process.argv.indexOf("--role");
const roleArgument =
  roleArgumentIndex >= 0 ? process.argv[roleArgumentIndex + 1] : undefined;
const runtimeRole =
  roleArgument ?? process.env.DATABASE_RUNTIME_ROLE ?? "restau_runtime";
const migrationUrl =
  process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;

if (!migrationUrl) throw new Error("Connexion propriétaire PostgreSQL manquante.");
if (!/^[a-z_][a-z0-9_]{0,62}$/.test(runtimeRole)) {
  throw new Error("Nom de rôle runtime invalide.");
}

const quotedRole = `"${runtimeRole}"`;
const runtimePassword = randomBytes(48).toString("base64url");
const passwordLiteral = `'${runtimePassword.replaceAll("'", "''")}'`;
const ownerClient = new Client({ connectionString: migrationUrl });

function setEnvValue(source: string, key: string, value: string) {
  const encoded = JSON.stringify(value);
  const pattern = new RegExp(`^${key}=.*$`, "m");
  if (pattern.test(source)) return source.replace(pattern, `${key}=${encoded}`);
  return `${source.replace(/\s*$/, "")}\n${key}=${encoded}\n`;
}

async function assertRuntimeIsolation(runtimeUrl: string) {
  const runtimeClient = new Client({ connectionString: runtimeUrl });
  await runtimeClient.connect();
  try {
    const identity = await runtimeClient.query<{
      current_user: string;
      can_create_schema: boolean;
      is_elevated: boolean;
    }>(`
      SELECT current_user,
             has_schema_privilege('public', 'CREATE') AS can_create_schema,
             (rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls)
               AS is_elevated
        FROM pg_roles
       WHERE rolname = current_user
    `);
    const row = identity.rows[0];
    if (
      row?.current_user !== runtimeRole ||
      row.can_create_schema ||
      row.is_elevated
    ) {
      throw new Error("Le rôle runtime conserve des privilèges élevés.");
    }

    await runtimeClient.query("SELECT 1 FROM users LIMIT 1");

    await runtimeClient.query("BEGIN");
    try {
      await runtimeClient.query(
        "CREATE TABLE public.__runtime_privilege_probe (id integer)",
      );
      throw new Error("Le rôle runtime peut encore créer des tables.");
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !("code" in error) ||
        error.code !== "42501"
      ) {
        throw error;
      }
    } finally {
      await runtimeClient.query("ROLLBACK");
    }
  } finally {
    await runtimeClient.end();
  }
}

try {
  await ownerClient.connect();
  await ownerClient.query("BEGIN");
  try {
    const existing = await ownerClient.query<{
      rolcanlogin: boolean;
      rolsuper: boolean;
      rolcreatedb: boolean;
      rolcreaterole: boolean;
      rolreplication: boolean;
      rolbypassrls: boolean;
    }>(`
      SELECT rolcanlogin, rolsuper, rolcreatedb, rolcreaterole,
             rolreplication, rolbypassrls
        FROM pg_roles
       WHERE rolname = $1
    `, [runtimeRole]);
    const role = existing.rows[0];

    if (!role) {
      await ownerClient.query(`
        CREATE ROLE ${quotedRole}
          LOGIN PASSWORD ${passwordLiteral}
          NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT
          NOREPLICATION NOBYPASSRLS
      `);
    } else {
      if (
        !role.rolcanlogin ||
        role.rolsuper ||
        role.rolcreatedb ||
        role.rolcreaterole ||
        role.rolreplication ||
        role.rolbypassrls
      ) {
        throw new Error("Le rôle runtime existant possède des attributs interdits.");
      }
      const inherited = await ownerClient.query<{ rolname: string }>(`
        SELECT candidate.rolname
          FROM pg_roles AS candidate
         WHERE candidate.rolname <> $1
           AND pg_has_role($1, candidate.oid, 'member')
      `, [runtimeRole]);
      if (inherited.rows.length > 0) {
        throw new Error("Le rôle runtime existant hérite d'autres rôles.");
      }
      await ownerClient.query(
        `ALTER ROLE ${quotedRole} PASSWORD ${passwordLiteral}`,
      );
    }

    const database = await ownerClient.query<{ name: string }>(
      "SELECT current_database() AS name",
    );
    const databaseName = database.rows[0]?.name;
    if (!databaseName || !/^[A-Za-z0-9_.-]+$/.test(databaseName)) {
      throw new Error("Nom de base de données inattendu.");
    }
    const quotedDatabase = `"${databaseName.replaceAll('"', '""')}"`;

    await ownerClient.query(
      `GRANT CONNECT ON DATABASE ${quotedDatabase} TO ${quotedRole}`,
    );
    await ownerClient.query("REVOKE CREATE ON SCHEMA public FROM PUBLIC");
    await ownerClient.query(`REVOKE ALL ON SCHEMA public FROM ${quotedRole}`);
    await ownerClient.query(`GRANT USAGE ON SCHEMA public TO ${quotedRole}`);
    await ownerClient.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${quotedRole}`,
    );
    await ownerClient.query(
      `GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO ${quotedRole}`,
    );
    await ownerClient.query(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${quotedRole}`,
    );
    await ownerClient.query(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO ${quotedRole}`,
    );

    await ownerClient.query("COMMIT");
  } catch (error) {
    await ownerClient.query("ROLLBACK");
    throw error;
  }
} finally {
  await ownerClient.end();
}

const runtimeUrl = new URL(migrationUrl);
runtimeUrl.username = runtimeRole;
runtimeUrl.password = runtimePassword;
await assertRuntimeIsolation(runtimeUrl.toString());

let envSource = readFileSync(envPath, "utf8");
envSource = setEnvValue(envSource, "DATABASE_MIGRATION_URL", migrationUrl);
envSource = setEnvValue(envSource, "DATABASE_URL", runtimeUrl.toString());
envSource = setEnvValue(envSource, "DATABASE_RUNTIME_ROLE", runtimeRole);
const temporaryEnvPath = `${envPath}.runtime-role-tmp`;
writeFileSync(temporaryEnvPath, envSource, { mode: 0o600 });
renameSync(temporaryEnvPath, envPath);
chmodSync(envPath, 0o600);

console.log(
  `Rôle ${runtimeRole} créé/renouvelé, testé et activé dans .env.local. ` +
    "Le mot de passe n'a pas été affiché.",
);
