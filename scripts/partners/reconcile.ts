import {
  Pool,
  type QueryResult,
  type QueryResultRow,
} from "pg";
import { setTimeout as delay } from "node:timers/promises";

const databaseUrl = process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_MIGRATION_URL ou DATABASE_URL est requis.");

const pool = new Pool({ connectionString: databaseUrl, max: 1 });

async function queryWithTransientRetry<T extends QueryResultRow>(
  query: string,
): Promise<QueryResult<T>> {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      return await pool.query<T>(query);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (
        !/ECONNRESET|connection timeout|socket disconnected/i.test(message) ||
        attempt === 4
      ) {
        throw error;
      }
      await delay(attempt * 500);
    }
  }
  throw new Error("Tentatives de réconciliation Partners épuisées.");
}

try {
  const result = await queryWithTransientRetry<{
    partners_without_account: number;
    accounts_on_non_partner: number;
    restaurant_accounts_without_restaurant: number;
    residence_accounts_without_residence: number;
    crossed_restaurant_accounts: number;
    crossed_residence_accounts: number;
    restaurant_accounts_with_multiple_restaurants: number;
  }>(`
    WITH entity_counts AS (
      SELECT
        account.id,
        account.activity_type,
        COUNT(DISTINCT restaurant.id)::int AS restaurant_count,
        COUNT(DISTINCT residence.id) FILTER (
          WHERE residence.archived_at IS NULL
        )::int AS residence_count
      FROM partner_accounts AS account
      LEFT JOIN restaurants AS restaurant
        ON restaurant.partner_account_id = account.id
      LEFT JOIN residences AS residence
        ON residence.partner_account_id = account.id
      GROUP BY account.id, account.activity_type
    )
    SELECT
      (
        SELECT COUNT(*)::int
        FROM users AS owner
        LEFT JOIN partner_accounts AS account ON account.user_id = owner.id
        WHERE owner.role = 'partner' AND account.id IS NULL
      ) AS partners_without_account,
      (
        SELECT COUNT(*)::int
        FROM partner_accounts AS account
        JOIN users AS owner ON owner.id = account.user_id
        WHERE owner.role <> 'partner'
      ) AS accounts_on_non_partner,
      COUNT(*) FILTER (
        WHERE activity_type = 'restaurant' AND restaurant_count = 0
      )::int AS restaurant_accounts_without_restaurant,
      COUNT(*) FILTER (
        WHERE activity_type = 'residence' AND residence_count = 0
      )::int AS residence_accounts_without_residence,
      COUNT(*) FILTER (
        WHERE activity_type = 'restaurant' AND residence_count > 0
      )::int AS crossed_restaurant_accounts,
      COUNT(*) FILTER (
        WHERE activity_type = 'residence' AND restaurant_count > 0
      )::int AS crossed_residence_accounts,
      COUNT(*) FILTER (
        WHERE activity_type = 'restaurant' AND restaurant_count > 1
      )::int AS restaurant_accounts_with_multiple_restaurants
    FROM entity_counts
  `);
  const row = result.rows[0];
  const report = {
    generatedAt: new Date().toISOString(),
    onboarding: {
      partnersAwaitingActivity: Number(row?.partners_without_account ?? 0),
      restaurantAccountsAwaitingEntity: Number(
        row?.restaurant_accounts_without_restaurant ?? 0,
      ),
      residenceAccountsWithoutResidence: Number(
        row?.residence_accounts_without_residence ?? 0,
      ),
    },
    anomalies: {
      accountsOwnedByNonPartner: Number(row?.accounts_on_non_partner ?? 0),
      restaurantAccountsOwningResidences: Number(
        row?.crossed_restaurant_accounts ?? 0,
      ),
      residenceAccountsOwningRestaurants: Number(
        row?.crossed_residence_accounts ?? 0,
      ),
      restaurantAccountsWithMultipleRestaurants: Number(
        row?.restaurant_accounts_with_multiple_restaurants ?? 0,
      ),
    },
  };
  console.log(JSON.stringify(report, null, 2));
  if (Object.values(report.anomalies).some((count) => count > 0)) {
    process.exitCode = 2;
  }
} finally {
  await pool.end();
}
