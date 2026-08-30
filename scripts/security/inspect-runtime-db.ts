import { Client } from "pg";

const connectionString =
  process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;
const runtimeRole = process.env.DATABASE_RUNTIME_ROLE ?? "restau_runtime";

if (!connectionString) throw new Error("Connexion PostgreSQL manquante.");
if (!/^[a-z_][a-z0-9_]{0,62}$/.test(runtimeRole)) {
  throw new Error("DATABASE_RUNTIME_ROLE invalide.");
}

const client = new Client({ connectionString });

try {
  await client.connect();
  const database = await client.query<{
        current_user: string;
        current_database: string;
        server_version: string;
        owner_is_elevated: boolean;
      }>(`
        SELECT current_user,
               current_database(),
               current_setting('server_version') AS server_version,
               (rolsuper OR rolcreatedb OR rolcreaterole OR rolbypassrls)
                 AS owner_is_elevated
          FROM pg_roles
         WHERE rolname = current_user
      `);
  const runtime = await client.query<{
        exists: boolean;
        can_login: boolean | null;
        is_elevated: boolean | null;
      }>(`
        SELECT EXISTS(SELECT 1 FROM pg_roles WHERE rolname = $1) AS exists,
               (SELECT rolcanlogin FROM pg_roles WHERE rolname = $1) AS can_login,
               (SELECT rolsuper OR rolcreatedb OR rolcreaterole OR
                       rolreplication OR rolbypassrls
                  FROM pg_roles WHERE rolname = $1) AS is_elevated
      `, [runtimeRole]);
  const memberships = runtime.rows[0]?.exists
    ? await client.query<{ role_name: string }>(`
          SELECT candidate.rolname AS role_name
            FROM pg_roles AS candidate
           WHERE candidate.rolname <> $1
             AND pg_has_role($1, candidate.oid, 'member')
           ORDER BY candidate.rolname
        `, [runtimeRole])
    : { rows: [] as { role_name: string }[] };
  const objects = await client.query<{
        tables: number;
        sequences: number;
        functions: number;
        security_definer_functions: number;
        identity_documents: number;
      }>(`
        SELECT
          (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')) AS tables,
          (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public' AND c.relkind = 'S') AS sequences,
          (SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public') AS functions,
          (SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public' AND p.prosecdef) AS security_definer_functions,
          (SELECT count(*)::int FROM partner_identity_documents) AS identity_documents
      `);
  const publicPrivileges = await client.query<{
        public_can_create_schema: boolean;
        public_can_use_schema: boolean;
      }>(`
        SELECT has_schema_privilege('public', 'public', 'CREATE') AS public_can_create_schema,
               has_schema_privilege('public', 'public', 'USAGE') AS public_can_use_schema
      `);
  const functions = await client.query<{
        name: string;
        owner: string;
        security_definer: boolean;
        extension: string | null;
      }>(`
        SELECT p.oid::regprocedure::text AS name,
               owner.rolname AS owner,
               p.prosecdef AS security_definer,
               extension.extname AS extension
          FROM pg_proc p
          JOIN pg_namespace n ON n.oid = p.pronamespace
          JOIN pg_roles owner ON owner.oid = p.proowner
          LEFT JOIN pg_depend dependency
            ON dependency.classid = 'pg_proc'::regclass
           AND dependency.objid = p.oid
           AND dependency.deptype = 'e'
          LEFT JOIN pg_extension extension ON extension.oid = dependency.refobjid
         WHERE n.nspname = 'public' AND p.prosecdef
         ORDER BY name
      `);

  console.log(JSON.stringify({
    database: database.rows[0],
    runtimeRole: { name: runtimeRole, ...runtime.rows[0] },
    inheritedRoles: memberships.rows.map(({ role_name }) => role_name),
    objects: objects.rows[0],
    publicPrivileges: publicPrivileges.rows[0],
    securityDefinerFunctions: functions.rows,
  }, null, 2));
} finally {
  await client.end();
}
