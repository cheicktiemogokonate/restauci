import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import {
  warmApplicationDatabaseConnections,
  warmNeonTestPool,
} from "./support/neon-test-connection";

const enabled = process.env.RUN_PHASE9_DB_TESTS === "true";
const allowDevelopment =
  process.env.ALLOW_DEVELOPMENT_PHASE9_DB_TESTS === "true";
const databaseUrl = process.env.DATABASE_URL;
if (enabled && (!databaseUrl || !allowDevelopment)) {
  throw new Error(
    "Les tests DB Phase 9 exigent DATABASE_URL et ALLOW_DEVELOPMENT_PHASE9_DB_TESTS=true",
  );
}
const describeDb = enabled ? describe : describe.skip;

describeDb("phase 9 restaurant order chain", () => {
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 2,
    connectionTimeoutMillis: 30_000,
    idleTimeoutMillis: 60_000,
    keepAlive: true,
  });
  const suffix = crypto.randomUUID();
  const adminId = crypto.randomUUID();
  const partnerUserId = crypto.randomUUID();
  const partnerAccountId = crypto.randomUUID();
  const restaurantId = crypto.randomUUID();
  const clientId = crypto.randomUUID();
  const categoryId = crypto.randomUUID();
  const dishId = crypto.randomUUID();
  const orderId = crypto.randomUUID();
  const transactionId = crypto.randomUUID();
  const paymentId = crypto.randomUUID();
  const commissionId = crypto.randomUUID();
  let commissions: typeof import("@/modules/commissions/server");
  let transactions: typeof import("@/modules/transactions/server");
  let transactionalDb: typeof import("@/infrastructure/db/transaction")["transactionalDb"];

  beforeAll(async () => {
    await warmNeonTestPool(pool);
    ({ transactionalDb } = await import("@/infrastructure/db/transaction"));
    commissions = await import("@/modules/commissions/server");
    transactions = await import("@/modules/transactions/server");
    await warmApplicationDatabaseConnections();
    await pool.query(
      `INSERT INTO users (id, nom, email, password, telephone, role, created_at, updated_at)
       VALUES
       ($1, 'Admin Phase 9', $2, 'x', $3, 'admin', NOW(), NOW()),
       ($4, 'Restaurant Phase 9', $5, 'x', $6, 'partner', NOW(), NOW())`,
      [
        adminId,
        `admin-phase9-${suffix}@example.test`,
        `+22591${suffix.replaceAll("-", "").slice(0, 8)}`,
        partnerUserId,
        `restaurant-phase9-${suffix}@example.test`,
        `+22592${suffix.replaceAll("-", "").slice(0, 8)}`,
      ],
    );
    await pool.query(
      `INSERT INTO partner_accounts (id, user_id, activity_type, created_at, updated_at)
       VALUES ($1, $2, 'restaurant', NOW(), NOW())`,
      [partnerAccountId, partnerUserId],
    );
    await pool.query(
      `INSERT INTO restaurants (
         id, partner_account_id, nom, slug, telephone, adresse,
         latitude, longitude, actif, en_ligne, accepte_commandes,
         created_at, updated_at
       ) VALUES (
         $1, $2, 'Restaurant Phase 9', $3, '+2250109090909', 'Abidjan',
         5.32, -4.01, true, true, true, NOW(), NOW()
       )`,
      [restaurantId, partnerAccountId, `restaurant-phase9-${suffix}`],
    );
    await pool.query(
      `INSERT INTO clients (id, nom, telephone, email, created_at, updated_at)
       VALUES ($1, 'Client Phase 9', $2, $3, NOW(), NOW())`,
      [
        clientId,
        `+22593${suffix.replaceAll("-", "").slice(0, 8)}`,
        `client-phase9-${suffix}@example.test`,
      ],
    );
    await pool.query(
      `INSERT INTO categories (
         id, restaurant_id, nom, ordre, publication_intent,
         first_published_at, created_at, updated_at
       ) VALUES ($1, $2, 'Carte Phase 9', 0, true, NOW(), NOW(), NOW())`,
      [categoryId, restaurantId],
    );
    await pool.query(
      `INSERT INTO plats (
         id, restaurant_id, categorie_id, nom, prix, disponible,
         publication_intent, first_published_at, created_at, updated_at
       ) VALUES ($1, $2, $3, 'Plat Phase 9', 2500, true, true, NOW(), NOW(), NOW())`,
      [dishId, restaurantId, categoryId],
    );
    await pool.query(
      `INSERT INTO commandes (
         id, numero, restaurant_id, client_id, mode_commande, statut,
         nom_client, telephone_client, items, sous_total, frais_livraison,
         remise, total, created_at, updated_at
       ) VALUES (
         $1, $2, $3, $4, 'sur_place', 'recue', 'Client Phase 9',
         '+2250700000000', $5::jsonb, 5000, 0, 0, 5000, NOW(), NOW()
       )`,
      [
        orderId,
        `P9-${suffix.slice(0, 8)}`,
        restaurantId,
        clientId,
        JSON.stringify([
          {
            platId: dishId,
            nom: "Plat Phase 9",
            prix: 2500,
            quantite: 2,
            totalLigne: 5000,
          },
        ]),
      ],
    );
    await pool.query(
      `INSERT INTO transactions (
         id, type, status, partner_account_id, client_id, amount_fcfa,
         restaurant_order_id, created_at, updated_at
       ) VALUES ($1, 'commande_restaurant', 'pending', $2, $3, 5000, $4, NOW(), NOW())`,
      [transactionId, partnerAccountId, clientId, orderId],
    );
    await pool.query(
      `INSERT INTO payments (
         id, transaction_id, method, status, amount_fcfa, idempotency_key,
         created_at, updated_at
       ) VALUES ($1, $2, 'cash', 'pending', 5000, $3, NOW(), NOW())`,
      [paymentId, transactionId, `phase9-order-${suffix}`],
    );
    await pool.query(
      `INSERT INTO commissions (
         id, commande_id, partner_account_id, base_amount_fcfa,
         rate_bps_snapshot, amount_fcfa, commercial_status, collection_mode,
         created_at, updated_at
       ) VALUES ($1, $2, $3, 5000, 1000, 500, 'pending', 'cash_receivable', NOW(), NOW())`,
      [commissionId, orderId, partnerAccountId],
    );
  }, 90_000);

  afterAll(async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "SELECT set_config('toutci.financial_journal_maintenance', 'on', true)",
      );
      await client.query(
        "DELETE FROM financial_journal_entries WHERE partner_account_id = $1",
        [partnerAccountId],
      );
      await client.query(
        "DELETE FROM outbox_messages WHERE event_id IN (SELECT id FROM business_events WHERE partner_account_id = $1)",
        [partnerAccountId],
      );
      await client.query(
        "DELETE FROM audit_log WHERE admin_id = $1 OR ressource_id = $2",
        [adminId, partnerAccountId],
      );
      await client.query(
        "DELETE FROM business_events WHERE partner_account_id = $1",
        [partnerAccountId],
      );
      await client.query(
        "DELETE FROM commission_settlement_allocations WHERE commission_id = $1",
        [commissionId],
      );
      await client.query(
        "DELETE FROM payments WHERE transaction_id IN (SELECT id FROM transactions WHERE partner_account_id = $1)",
        [partnerAccountId],
      );
      await client.query(
        "DELETE FROM transactions WHERE partner_account_id = $1",
        [partnerAccountId],
      );
      await client.query(
        "DELETE FROM commission_settlements WHERE partner_account_id = $1",
        [partnerAccountId],
      );
      await client.query("DELETE FROM commissions WHERE id = $1", [commissionId]);
      await client.query("DELETE FROM commandes WHERE id = $1", [orderId]);
      await client.query("DELETE FROM plats WHERE id = $1", [dishId]);
      await client.query("DELETE FROM categories WHERE id = $1", [categoryId]);
      await client.query("DELETE FROM restaurants WHERE id = $1", [restaurantId]);
      await client.query("DELETE FROM clients WHERE id = $1", [clientId]);
      await client.query("DELETE FROM partner_accounts WHERE id = $1", [partnerAccountId]);
      await client.query("DELETE FROM users WHERE id = ANY($1::varchar[])", [
        [adminId, partnerUserId],
      ]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
      await pool.end();
    }
  }, 90_000);

  it("marks and repairs an incomplete financial chain", async () => {
    const initial = await pool.query(
      "SELECT issues FROM restaurant_order_chain_health WHERE order_id = $1",
      [orderId],
    );
    expect(initial.rows[0]?.issues).toEqual([]);

    await pool.query("UPDATE transactions SET amount_fcfa = 4999 WHERE id = $1", [
      transactionId,
    ]);
    await pool.query("SELECT refresh_restaurant_order_reconciliation($1)", [
      orderId,
    ]);
    const incomplete = await pool.query(
      "SELECT reconciliation_state, reconciliation_issues FROM commandes WHERE id = $1",
      [orderId],
    );
    expect(incomplete.rows[0]).toMatchObject({
      reconciliation_state: "legacy_incomplete",
      reconciliation_issues: expect.arrayContaining(["transaction_amount_mismatch"]),
    });

    await pool.query("UPDATE transactions SET amount_fcfa = 5000 WHERE id = $1", [
      transactionId,
    ]);
    await pool.query("SELECT refresh_restaurant_order_reconciliation($1)", [
      orderId,
    ]);
    const repaired = await pool.query(
      "SELECT reconciliation_state, reconciliation_issues FROM commandes WHERE id = $1",
      [orderId],
    );
    expect(repaired.rows[0]).toEqual({
      reconciliation_state: "complete",
      reconciliation_issues: [],
    });
  });

  it("projects served client, restaurant and dish counters from orders", async () => {
    await pool.query(
      "UPDATE transactions SET status = 'paid', paid_at = NOW(), updated_at = NOW() WHERE id = $1",
      [transactionId],
    );
    await pool.query(
      "UPDATE payments SET status = 'confirmed', confirmed_at = NOW(), updated_at = NOW() WHERE id = $1",
      [paymentId],
    );
    await pool.query(
      "UPDATE commissions SET commercial_status = 'due', due_at = NOW(), updated_at = NOW() WHERE id = $1",
      [commissionId],
    );
    await pool.query(
      "UPDATE commandes SET statut = 'servie', heure_servie = NOW(), updated_at = NOW() WHERE id = $1",
      [orderId],
    );
    await pool.query("SELECT refresh_restaurant_order_reconciliation($1)", [
      orderId,
    ]);

    const projections = await pool.query(
      `SELECT
         client.completed_order_count AS client_orders,
         client.completed_spend_fcfa AS client_spend,
         restaurant.completed_order_count AS restaurant_orders,
         dish.completed_quantity AS dish_quantity
       FROM client_order_projections client
       JOIN restaurant_order_projections restaurant ON restaurant.restaurant_id = $2
       JOIN dish_order_projections dish ON dish.dish_id = $3
       WHERE client.client_id = $1`,
      [clientId, restaurantId, dishId],
    );
    expect(projections.rows[0]).toMatchObject({
      client_orders: 1,
      client_spend: "5000",
      restaurant_orders: 1,
      dish_quantity: "2",
    });
    const health = await pool.query(
      "SELECT reconciliation_state, reconciliation_issues FROM commandes WHERE id = $1",
      [orderId],
    );
    expect(health.rows[0]).toEqual({
      reconciliation_state: "complete",
      reconciliation_issues: [],
    });
  });

  it("settles the same FIFO debt through offline and Paystack paths", async () => {
    const offline = await commissions.createManualCommissionSettlement({
      partnerAccountId,
      adminId,
      amountFcfa: 200,
      method: "especes",
      externalReference: `offline-phase9-${suffix}`,
      justification: "Encaissement de validation Phase 9",
      paidAt: new Date(),
    });
    expect(offline.allocations).toEqual([
      { commissionId, amountFcfa: 200 },
    ]);

    const online = await commissions.preparePaystackCommissionSettlement({
      partnerAccountId,
      amountFcfa: 300,
    });
    const confirmed = await transactionalDb.transaction(async (tx) => {
      const payment = await transactions.confirmPaymentInTransaction(tx, {
        paymentId: online.payment.id,
      });
      const settlement =
        await commissions.confirmReservedSettlementInTransaction(
          tx,
          online.settlement.id,
        );
      return { payment, settlement };
    });
    expect(confirmed.payment).toMatchObject({
      paymentId: online.payment.id,
      transactionId: online.transaction.id,
      alreadyConfirmed: false,
    });
    expect(confirmed.settlement.allocations).toEqual([
      { commissionId, amountFcfa: 300 },
    ]);

    const state = await pool.query(
      `SELECT
         COALESCE(SUM(allocation.amount_fcfa), 0)::integer AS allocated,
         COUNT(DISTINCT settlement.id)::integer AS settlements,
         COUNT(DISTINCT transaction.id) FILTER (WHERE transaction.status = 'paid')::integer AS paid_transactions,
         COUNT(DISTINCT payment.id) FILTER (WHERE payment.status = 'confirmed')::integer AS confirmed_payments
       FROM commission_settlement_allocations allocation
       JOIN commission_settlements settlement ON settlement.id = allocation.settlement_id
       JOIN transactions transaction ON transaction.commission_settlement_id = settlement.id
       JOIN payments payment ON payment.transaction_id = transaction.id
       WHERE allocation.commission_id = $1`,
      [commissionId],
    );
    expect(state.rows[0]).toEqual({
      allocated: 500,
      settlements: 2,
      paid_transactions: 2,
      confirmed_payments: 2,
    });
    await expect(
      commissions.getAvailableCashCommissionDebt(partnerAccountId),
    ).resolves.toBe(0);
  }, 60_000);
});
