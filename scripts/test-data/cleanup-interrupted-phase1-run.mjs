import { Pool } from "pg";

const confirmation = process.argv.includes("--confirmed-development-test");
const startedAtArgument = process.argv.find((argument) =>
  argument.startsWith("--started-at="),
);
const startedAt = startedAtArgument?.slice("--started-at=".length);
const databaseUrl = process.env.DATABASE_URL;

if (!confirmation || !startedAt || Number.isNaN(Date.parse(startedAt))) {
  throw new Error(
    "Utilisez --confirmed-development-test et --started-at=<date ISO>.",
  );
}
if (!databaseUrl) throw new Error("DATABASE_URL est absente de .env.local.");
if (
  process.env.NODE_ENV === "production" ||
  process.env.VERCEL_ENV === "production"
) {
  throw new Error("Le nettoyage Phase 1 refuse la production.");
}

const parsed = new URL(databaseUrl);
if (!parsed.hostname.endsWith(".neon.tech")) {
  throw new Error("Le nettoyage vise uniquement la Neon de développement/test.");
}
parsed.hostname = parsed.hostname.replace("-pooler", "");

const pool = new Pool({
  connectionString: parsed.toString(),
  max: 1,
  connectionTimeoutMillis: 30_000,
});
const client = await pool.connect();

try {
  await client.query("BEGIN");
  const users = await client.query(
    `SELECT id FROM users
     WHERE created_at >= $1
       AND nom IN (
         'Partner B8', 'Admin B8', 'Partenaire Bloc 7', 'Admin Bloc 7'
       )`,
    [startedAt],
  );
  const userIds = users.rows.map((row) => row.id);
  if (userIds.length === 0) {
    await client.query("ROLLBACK");
    console.log(JSON.stringify({ cleanedUsers: 0 }));
  } else {
    const accounts = await client.query(
      "SELECT id FROM partner_accounts WHERE user_id = ANY($1::varchar[])",
      [userIds],
    );
    const accountIds = accounts.rows.map((row) => row.id);
    const restaurants = await client.query(
      "SELECT id FROM restaurants WHERE partner_account_id = ANY($1::uuid[])",
      [accountIds],
    );
    const restaurantIds = restaurants.rows.map((row) => row.id);
    const orders = await client.query(
      "SELECT id FROM commandes WHERE restaurant_id = ANY($1::varchar[])",
      [restaurantIds],
    );
    const orderIds = orders.rows.map((row) => row.id);
    const clients = await client.query(
      `SELECT id FROM clients
       WHERE created_at >= $1 AND nom IN ('Client B8', 'Client Bloc 7')`,
      [startedAt],
    );
    const clientIds = clients.rows.map((row) => row.id);

    await client.query(
      "DELETE FROM audit_log WHERE ressource_id = ANY($1::text[])",
      [accountIds],
    );
    await client.query(
      `DELETE FROM payments WHERE transaction_id IN (
        SELECT id FROM transactions WHERE partner_account_id = ANY($1::uuid[])
      )`,
      [accountIds],
    );
    await client.query(
      "DELETE FROM transactions WHERE partner_account_id = ANY($1::uuid[])",
      [accountIds],
    );
    await client.query(
      `DELETE FROM commission_settlement_allocations WHERE settlement_id IN (
        SELECT id FROM commission_settlements
        WHERE partner_account_id = ANY($1::uuid[])
      )`,
      [accountIds],
    );
    await client.query(
      "DELETE FROM commission_settlements WHERE partner_account_id = ANY($1::uuid[])",
      [accountIds],
    );
    await client.query(
      "DELETE FROM commissions WHERE partner_account_id = ANY($1::uuid[])",
      [accountIds],
    );
    await client.query(
      "DELETE FROM payment_provider_accounts WHERE partner_account_id = ANY($1::uuid[])",
      [accountIds],
    );
    await client.query(
      `DELETE FROM subscription_period_limits WHERE subscription_period_id IN (
        SELECT id FROM subscription_periods
        WHERE partner_account_id = ANY($1::uuid[])
      )`,
      [accountIds],
    );
    await client.query(
      "DELETE FROM subscription_periods WHERE partner_account_id = ANY($1::uuid[])",
      [accountIds],
    );
    await client.query(
      "DELETE FROM subscription_requests WHERE partner_account_id = ANY($1::uuid[])",
      [accountIds],
    );
    await client.query("DELETE FROM commandes WHERE id = ANY($1::varchar[])", [
      orderIds,
    ]);
    await client.query("DELETE FROM clients WHERE id = ANY($1::varchar[])", [
      clientIds,
    ]);
    await client.query(
      "DELETE FROM restaurants WHERE id = ANY($1::varchar[])",
      [restaurantIds],
    );
    await client.query(
      "DELETE FROM partner_accounts WHERE id = ANY($1::uuid[])",
      [accountIds],
    );
    await client.query("DELETE FROM users WHERE id = ANY($1::varchar[])", [
      userIds,
    ]);
    await client.query("COMMIT");
    console.log(
      JSON.stringify({
        cleanedUsers: userIds.length,
        cleanedPartnerAccounts: accountIds.length,
        cleanedRestaurants: restaurantIds.length,
        cleanedOrders: orderIds.length,
        cleanedClients: clientIds.length,
      }),
    );
  }
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
