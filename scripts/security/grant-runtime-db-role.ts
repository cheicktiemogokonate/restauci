import { Pool } from "pg";

const migrationUrl = process.env.DATABASE_MIGRATION_URL;
const runtimeUrl = process.env.DATABASE_URL;
const roleArgumentIndex = process.argv.indexOf("--role");
const roleArgument =
  roleArgumentIndex >= 0 ? process.argv[roleArgumentIndex + 1] : undefined;
const runtimeRole = roleArgument ?? process.env.DATABASE_RUNTIME_ROLE;

if (!migrationUrl) {
  throw new Error("DATABASE_MIGRATION_URL est obligatoire (rôle propriétaire dédié aux migrations).");
}
if (!runtimeUrl) {
  throw new Error("DATABASE_URL est obligatoire (rôle applicatif restreint).");
}
if (migrationUrl === runtimeUrl) {
  throw new Error("DATABASE_URL ne doit pas utiliser le rôle de migration/propriétaire.");
}
if (!runtimeRole || !/^[a-z_][a-z0-9_]{0,62}$/.test(runtimeRole)) {
  throw new Error("DATABASE_RUNTIME_ROLE est manquant ou invalide.");
}

const quotedRole = `"${runtimeRole}"`;
const pool = new Pool({ connectionString: migrationUrl, max: 1 });

try {
  const [roleResult, databaseResult] = await Promise.all([
    pool.query<{
      rolcanlogin: boolean;
      rolcreatedb: boolean;
      rolcreaterole: boolean;
      rolreplication: boolean;
      rolbypassrls: boolean;
      rolsuper: boolean;
    }>(
      `SELECT rolcanlogin, rolcreatedb, rolcreaterole, rolreplication,
              rolbypassrls, rolsuper
         FROM pg_roles
        WHERE rolname = $1`,
      [runtimeRole],
    ),
    pool.query<{ database_name: string }>(
      "SELECT current_database() AS database_name",
    ),
  ]);
  const role = roleResult.rows[0];
  if (!role?.rolcanlogin) {
    throw new Error(
      `Le rôle ${runtimeRole} doit être créé comme rôle LOGIN dans le fournisseur PostgreSQL avant ce script.`,
    );
  }
  if (
    role.rolsuper ||
    role.rolcreatedb ||
    role.rolcreaterole ||
    role.rolreplication ||
    role.rolbypassrls
  ) {
    throw new Error(
      `Le rôle ${runtimeRole} possède encore des attributs privilégiés. Retirez-les avant utilisation.`,
    );
  }

  const inheritedRoles = await pool.query<{ rolname: string }>(
    `SELECT candidate.rolname
       FROM pg_roles AS candidate
      WHERE candidate.rolname <> $1
        AND pg_has_role($1, candidate.oid, 'member')
      ORDER BY candidate.rolname`,
    [runtimeRole],
  );
  if (inheritedRoles.rows.length > 0) {
    throw new Error(
      `Le rôle ${runtimeRole} hérite encore de rôles (${inheritedRoles.rows
        .map(({ rolname }) => rolname)
        .join(", ")}). Utilisez un rôle dédié sans appartenance héritée.`,
    );
  }

  const databaseName = databaseResult.rows[0]?.database_name;
  if (!databaseName || !/^[A-Za-z0-9_.-]+$/.test(databaseName)) {
    throw new Error("Nom de base de données inattendu.");
  }
  const quotedDatabase = `"${databaseName.replaceAll('"', '""')}"`;

  await pool.query("BEGIN");
  try {
    await pool.query(`GRANT CONNECT ON DATABASE ${quotedDatabase} TO ${quotedRole}`);
    await pool.query(`REVOKE ALL ON SCHEMA public FROM ${quotedRole}`);
    await pool.query(`GRANT USAGE ON SCHEMA public TO ${quotedRole}`);
    const createPrivilege = await pool.query<{ can_create: boolean }>(
      "SELECT has_schema_privilege($1, 'public', 'CREATE') AS can_create",
      [runtimeRole],
    );
    if (createPrivilege.rows[0]?.can_create) {
      throw new Error(
        `${runtimeRole} peut encore CREATE dans public via PUBLIC ou un droit hérité. Révoquez ce droit avant de relancer.`,
      );
    }
    await pool.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${quotedRole}`,
    );
    await pool.query(
      `GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO ${quotedRole}`,
    );
    await pool.query(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${quotedRole}`,
    );
    await pool.query(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO ${quotedRole}`,
    );
    await pool.query("COMMIT");
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  }

  console.log(`Privilèges runtime minimaux appliqués au rôle ${runtimeRole}.`);
} finally {
  await pool.end();
}
