import { neon } from "@neondatabase/serverless";

const confirmation = process.argv.includes("--confirmed-development-test");
const databaseUrl = process.env.DATABASE_URL;

if (!confirmation) {
  throw new Error(
    "Ajoutez --confirmed-development-test pour confirmer la base de développement/test.",
  );
}
if (!databaseUrl) throw new Error("DATABASE_URL est absente de .env.local.");
if (
  process.env.NODE_ENV === "production" ||
  process.env.VERCEL_ENV === "production"
) {
  throw new Error("Le snapshot Phase 1 refuse un environnement de production.");
}

const parsed = new URL(databaseUrl);
if (!parsed.hostname.endsWith(".neon.tech")) {
  throw new Error(
    "Le snapshot doit lire la Neon de développement/test explicitement désignée.",
  );
}

const sql = neon(databaseUrl);
const rows = await sql.query(
  `SELECT
    (SELECT COUNT(*) FROM users)::int AS users,
    (SELECT COUNT(*) FROM partner_accounts)::int AS partner_accounts,
    (SELECT COUNT(*) FROM restaurants)::int AS restaurants,
    (SELECT COUNT(*) FROM residences)::int AS residences,
    (SELECT COUNT(*) FROM commandes)::int AS restaurant_orders,
    (SELECT COUNT(*) FROM residence_reservations)::int AS residence_reservations,
    (SELECT COUNT(*) FROM transactions)::int AS transactions,
    (SELECT COUNT(*) FROM payments)::int AS payments,
    (SELECT COUNT(*) FROM notifications)::int AS notifications,
    (
      SELECT COUNT(*) FROM users AS app_user
      LEFT JOIN partner_accounts AS account ON account.user_id = app_user.id
      WHERE app_user.role = 'partner' AND account.id IS NULL
    )::int AS partners_without_account,
    (
      SELECT COUNT(*) FROM partner_accounts AS account
      INNER JOIN users AS app_user ON app_user.id = account.user_id
      WHERE app_user.role = 'admin'
    )::int AS admin_partner_accounts,
    (
      SELECT COUNT(*) FROM partner_accounts AS account
      LEFT JOIN restaurants AS restaurant ON restaurant.partner_account_id = account.id
      WHERE account.activity_type = 'restaurant' AND restaurant.id IS NULL
    )::int AS restaurant_accounts_without_restaurant,
    (
      SELECT COUNT(*) FROM partner_accounts AS account
      WHERE account.activity_type = 'residence'
        AND NOT EXISTS (
          SELECT 1 FROM residences AS residence
          WHERE residence.partner_account_id = account.id
            AND residence.archived_at IS NULL
        )
    )::int AS residence_accounts_without_residence,
    (
      SELECT COUNT(*) FROM commandes AS restaurant_order
      WHERE NOT EXISTS (
        SELECT 1 FROM transactions AS transaction
        WHERE transaction.restaurant_order_id = restaurant_order.id
      )
    )::int AS restaurant_orders_without_transaction,
    (
      SELECT COUNT(*) FROM commandes AS restaurant_order
      WHERE NOT EXISTS (
        SELECT 1 FROM commissions AS commission
        WHERE commission.commande_id = restaurant_order.id
      )
    )::int AS restaurant_orders_without_commission,
    (
      SELECT COUNT(*) FROM transactions AS transaction
      WHERE transaction.status = 'paid'
        AND NOT EXISTS (
          SELECT 1 FROM payments AS payment
          WHERE payment.transaction_id = transaction.id
            AND payment.status = 'confirmed'
        )
    )::int AS paid_transactions_without_confirmed_payment,
    (
      SELECT COUNT(*) FROM notifications AS notification
      WHERE
        (notification.lien_type = 'commande' AND NOT EXISTS (
          SELECT 1 FROM commandes WHERE commandes.id = notification.lien_id
        ))
        OR (notification.lien_type = 'residence' AND NOT EXISTS (
          SELECT 1 FROM residences WHERE residences.id::text = notification.lien_id
        ))
        OR (notification.lien_type = 'reservation_residence' AND NOT EXISTS (
          SELECT 1 FROM residence_reservations
          WHERE residence_reservations.id::text = notification.lien_id
        ))
        OR (notification.lien_type = 'restaurant' AND NOT EXISTS (
          SELECT 1 FROM restaurants WHERE restaurants.id = notification.lien_id
        ))
    )::int AS notifications_with_missing_known_target`,
  [],
);

const row = rows[0];
const snapshot = {
  schemaVersion: 1,
  capturedAt: new Date().toISOString(),
  environment: "configured-neon-development-test",
  aggregates: {
    users: row.users,
    partnerAccounts: row.partner_accounts,
    restaurants: row.restaurants,
    residences: row.residences,
    restaurantOrders: row.restaurant_orders,
    residenceReservations: row.residence_reservations,
    transactions: row.transactions,
    payments: row.payments,
    notifications: row.notifications,
  },
  anomalies: {
    partnersWithoutAccount: row.partners_without_account,
    adminPartnerAccounts: row.admin_partner_accounts,
    restaurantAccountsWithoutRestaurant:
      row.restaurant_accounts_without_restaurant,
    residenceAccountsWithoutResidence:
      row.residence_accounts_without_residence,
    restaurantOrdersWithoutTransaction:
      row.restaurant_orders_without_transaction,
    restaurantOrdersWithoutCommission:
      row.restaurant_orders_without_commission,
    paidTransactionsWithoutConfirmedPayment:
      row.paid_transactions_without_confirmed_payment,
    notificationsWithMissingKnownTarget:
      row.notifications_with_missing_known_target,
  },
};

console.log(JSON.stringify(snapshot, null, 2));
