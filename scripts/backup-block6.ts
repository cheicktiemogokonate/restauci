import { migrationPool } from "../drizzle/db-pool.ts";

const backupSchema = "block6_backup_20260813";

async function main() {
  const client = await migrationPool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${backupSchema}`);
    for (const table of ["commissions", "commission_settlements"]) {
      const exists = await client.query<{ exists: boolean }>(
        "SELECT to_regclass($1) IS NOT NULL AS exists",
        [`public.${table}`],
      );
      if (exists.rows[0]?.exists) {
        await client.query(`DROP TABLE IF EXISTS ${backupSchema}.${table}`);
        await client.query(
          `CREATE TABLE ${backupSchema}.${table} AS TABLE public.${table}`,
        );
      }
    }
    await client.query("COMMIT");
    const counts = await client.query<{ table_name: string; rows: string }>(`
      SELECT 'commissions' AS table_name, COUNT(*)::text AS rows FROM ${backupSchema}.commissions
      UNION ALL
      SELECT 'commission_settlements', COUNT(*)::text FROM ${backupSchema}.commission_settlements
    `);
    console.log(JSON.stringify({ backupSchema, counts: counts.rows }));
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await migrationPool.end();
  }
}

await main();
