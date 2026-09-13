import { migrationPool } from "../../drizzle/db-pool.ts";

const apply = process.argv.includes("--apply");
const client = await migrationPool.connect();

try {
  await client.query(apply ? "BEGIN" : "BEGIN READ ONLY");
  let refreshed = 0;
  if (apply) {
    const result = await client.query<{ refreshed: number }>(
      "SELECT refresh_restaurant_order_reconciliation(NULL) AS refreshed",
    );
    refreshed = Number(result.rows[0]?.refreshed ?? 0);
  }
  const summary = await client.query(`
      SELECT
        COUNT(*)::integer AS total_orders,
        COUNT(*) FILTER (WHERE cardinality(issues) = 0)::integer AS complete_orders,
        COUNT(*) FILTER (WHERE cardinality(issues) > 0)::integer AS incomplete_orders
      FROM restaurant_order_chain_health
    `);
  const issues = await client.query(`
      SELECT issue, COUNT(*)::integer AS affected_orders
      FROM restaurant_order_chain_health health,
        LATERAL unnest(health.issues) issue
      GROUP BY issue
      ORDER BY affected_orders DESC, issue
    `);
  const counterDrift = await client.query(`
      SELECT
        (SELECT COUNT(*)::integer
         FROM clients client
         JOIN client_order_projections projection ON projection.client_id = client.id
         WHERE client.nombre_commandes <> projection.completed_order_count
            OR client.total_depense::bigint <> projection.completed_spend_fcfa) AS client_rows,
        (SELECT COUNT(*)::integer
         FROM restaurants restaurant
         JOIN restaurant_order_projections projection ON projection.restaurant_id = restaurant.id
         WHERE restaurant.nombre_commandes <> projection.completed_order_count) AS restaurant_rows,
        (SELECT COUNT(*)::integer
         FROM plats dish
         JOIN dish_order_projections projection ON projection.dish_id = dish.id
         WHERE dish.nombre_commandes::bigint <> projection.completed_quantity) AS dish_rows
    `);
  await client.query("COMMIT");
  console.log(
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        mode: apply ? "apply" : "read-only",
        refreshed,
        orders: summary.rows[0],
        issues: issues.rows,
        legacyCounterDrift: counterDrift.rows[0],
      },
      null,
      2,
    ),
  );
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  throw error;
} finally {
  client.release();
  await migrationPool.end();
}
