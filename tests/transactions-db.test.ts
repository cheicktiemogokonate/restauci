import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { readFileSync } from "node:fs";

const runDatabaseTests = process.env.RUN_TRANSACTION_DB_TESTS === "true";
const allowDevelopmentDatabase =
  process.env.ALLOW_DEVELOPMENT_TRANSACTION_DB_TESTS === "true";
const databaseUrl =
  process.env.TEST_DATABASE_URL ??
  process.env.DATABASE_URL_TEST ??
  (allowDevelopmentDatabase ? process.env.DATABASE_URL : undefined);
if (runDatabaseTests && !databaseUrl) {
  throw new Error("TEST_DATABASE_URL est obligatoire pour les tests DB du Bloc 7");
}
let developmentUrl: string | undefined;
try {
  developmentUrl = readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .map((line) => line.match(/^DATABASE_URL=(.*)$/)?.[1]?.replace(/^['"]|['"]$/g, ""))
    .find(Boolean);
} catch {
  developmentUrl = process.env.TEST_DATABASE ? undefined : process.env.DATABASE_URL;
}
if (
  runDatabaseTests &&
  databaseUrl === developmentUrl &&
  !allowDevelopmentDatabase
) {
  throw new Error("La base de test doit être distincte de DATABASE_URL");
}
const describeDatabase = runDatabaseTests ? describe : describe.skip;

describeDatabase("transactions and payments database invariants", () => {
  let transactionService: typeof import("@/modules/transactions/server");
  let commissionLedger: typeof import("@/lib/commissions/ledger");
  const pool = new Pool({ connectionString: databaseUrl, max: 5 });
  const suffix = crypto.randomUUID();
  const partnerUserId = crypto.randomUUID();
  const adminUserId = crypto.randomUUID();
  const partnerAccountId = crypto.randomUUID();
  const restaurantId = crypto.randomUUID();
  const clientId = crypto.randomUUID();
  const orderIds: string[] = [];
  const subscriptionRequestIds: string[] = [];

  async function createOrderSource(amountFcfa = 25_000) {
    const orderId = crypto.randomUUID();
    orderIds.push(orderId);
    await pool.query(
      `INSERT INTO commandes (
        id, numero, restaurant_id, client_id, mode_commande, statut,
        nom_client, items, sous_total, frais_livraison, remise, total,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, 'emporter', 'recue', 'Client test', '[]'::jsonb,
        $5, 0, 0, $5, NOW(), NOW())`,
      [orderId, `B7-${crypto.randomUUID().slice(0, 12)}`, restaurantId, clientId, amountFcfa],
    );
    return orderId;
  }

  async function createOrderTransaction(amountFcfa = 25_000) {
    const orderId = await createOrderSource(amountFcfa);
    const transaction = await transactionService.createTransaction({
      type: "commande_restaurant",
      restaurantOrderId: orderId,
      partnerAccountId,
      clientId,
      amountFcfa,
    });
    return { orderId, transaction };
  }

  beforeAll(async () => {
    transactionService = await import("@/modules/transactions/server");
    commissionLedger = await import("@/lib/commissions/ledger");
    await pool.query(
      `INSERT INTO users (id, nom, email, password, telephone, role, created_at, updated_at)
       VALUES
       ($1, 'Partenaire Bloc 7', $2, 'not-a-real-password', '+2250000000001', 'partner', NOW(), NOW()),
       ($3, 'Admin Bloc 7', $4, 'not-a-real-password', '+2250000000002', 'admin', NOW(), NOW())`,
      [
        partnerUserId,
        `b7-partner-${suffix}@example.test`,
        adminUserId,
        `b7-admin-${suffix}@example.test`,
      ],
    );
    await pool.query(
      `INSERT INTO partner_accounts (id, user_id, activity_type, created_at, updated_at)
       VALUES ($1, $2, 'restaurant', NOW(), NOW())`,
      [partnerAccountId, partnerUserId],
    );
    await pool.query(
      `INSERT INTO restaurants (
        id, partner_account_id, nom, slug, telephone, adresse, latitude, longitude,
        created_at, updated_at
      ) VALUES ($1, $2, 'Restaurant Bloc 7', $3, '+2250000000003', 'Test', 0, 0, NOW(), NOW())`,
      [restaurantId, partnerAccountId, `restaurant-b7-${suffix}`],
    );
    await pool.query(
      `INSERT INTO clients (
        id, nom, telephone, password, actif, created_at, updated_at
      ) VALUES ($1, 'Client Bloc 7', '+2250000000004', 'not-a-real-password', true, NOW(), NOW())`,
      [clientId],
    );
  }, 60_000);

  afterAll(async () => {
    await pool.query("DELETE FROM audit_log WHERE ressource_id = $1", [partnerAccountId]);
    await pool.query(
      "DELETE FROM payments WHERE transaction_id IN (SELECT id FROM transactions WHERE partner_account_id = $1)",
      [partnerAccountId],
    );
    await pool.query("DELETE FROM transactions WHERE partner_account_id = $1", [partnerAccountId]);
    await pool.query(
      "DELETE FROM commission_settlement_allocations WHERE settlement_id IN (SELECT id FROM commission_settlements WHERE partner_account_id = $1)",
      [partnerAccountId],
    );
    await pool.query("DELETE FROM commission_settlements WHERE partner_account_id = $1", [partnerAccountId]);
    await pool.query("DELETE FROM commissions WHERE partner_account_id = $1", [partnerAccountId]);
    await pool.query("DELETE FROM subscription_requests WHERE partner_account_id = $1", [partnerAccountId]);
    if (orderIds.length > 0) {
      await pool.query("DELETE FROM commandes WHERE id = ANY($1::varchar[])", [orderIds]);
    }
    await pool.query("DELETE FROM clients WHERE id = $1", [clientId]);
    await pool.query("DELETE FROM restaurants WHERE id = $1", [restaurantId]);
    await pool.query("DELETE FROM partner_accounts WHERE id = $1", [partnerAccountId]);
    await pool.query("DELETE FROM users WHERE id = ANY($1::varchar[])", [[partnerUserId, adminUserId]]);
    await pool.end();
  }, 60_000);

  it("creates a command obligation and a normal cash attempt in exact FCFA", async () => {
    const { orderId, transaction } = await createOrderTransaction(25_000);
    const payment = await transactionService.createPaymentAttempt({
      transactionId: transaction.id,
      amountFcfa: 25_000,
      method: "cash",
      provider: null,
      idempotencyKey: `cash:${orderId}`,
    });
    const replay = await transactionService.createPaymentAttempt({
      transactionId: transaction.id,
      amountFcfa: 25_000,
      method: "cash",
      provider: null,
      idempotencyKey: `cash:${orderId}`,
    });
    const loaded = await transactionService.getTransaction(transaction.id);

    expect(transaction.restaurantOrderId).toBe(orderId);
    expect(transaction.amountFcfa).toBe(25_000);
    expect(transaction.currency).toBe("XOF");
    expect(payment.provider).toBeNull();
    expect(payment.method).toBe("cash");
    expect(payment.amountFcfa).toBe(25_000);
    expect(replay.id).toBe(payment.id);
    expect(loaded?.payments).toHaveLength(1);
  });

  it("confirms idempotently and refuses a normal payment after paid", async () => {
    const { transaction } = await createOrderTransaction();
    const payment = await transactionService.createPaymentAttempt({
      transactionId: transaction.id,
      amountFcfa: transaction.amountFcfa,
      method: "cash",
    });
    const first = await transactionService.confirmPayment({ paymentId: payment.id });
    const replay = await transactionService.confirmPayment({ paymentId: payment.id });

    expect(first.alreadyConfirmed).toBe(false);
    expect(replay.alreadyConfirmed).toBe(true);
    await expect(
      transactionService.createPaymentAttempt({
        transactionId: transaction.id,
        amountFcfa: transaction.amountFcfa,
        method: "cash",
      }),
    ).rejects.toMatchObject({ code: "TRANSACTION_ALREADY_PAID" });
  }, 60_000);

  it("has a single logical winner under concurrent confirmations", async () => {
    const { transaction } = await createOrderTransaction();
    const payment = await transactionService.createPaymentAttempt({
      transactionId: transaction.id,
      amountFcfa: transaction.amountFcfa,
      method: "cash",
    });
    const results = await Promise.all([
      transactionService.confirmPayment({ paymentId: payment.id }),
      transactionService.confirmPayment({ paymentId: payment.id }),
    ]);
    expect(results.filter((result) => !result.alreadyConfirmed)).toHaveLength(1);
    expect(results.filter((result) => result.alreadyConfirmed)).toHaveLength(1);
  }, 60_000);

  it("allows multiple attempts but only one payment of the transaction", async () => {
    const { transaction } = await createOrderTransaction();
    const first = await transactionService.createPaymentAttempt({
      transactionId: transaction.id,
      amountFcfa: transaction.amountFcfa,
      method: "mobile_money",
      network: "wave",
    });
    const second = await transactionService.createPaymentAttempt({
      transactionId: transaction.id,
      amountFcfa: transaction.amountFcfa,
      method: "mobile_money",
      network: "orange",
    });
    const results = await Promise.allSettled([
      transactionService.confirmPayment({ paymentId: first.id }),
      transactionService.confirmPayment({ paymentId: second.id }),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
  }, 60_000);

  it("enforces provider reference uniqueness", async () => {
    const first = await createOrderTransaction();
    const second = await createOrderTransaction();
    const providerReference = `provider-${suffix}`;
    await transactionService.createPaymentAttempt({
      transactionId: first.transaction.id,
      amountFcfa: first.transaction.amountFcfa,
      method: "mobile_money",
      provider: "paystack",
      providerReference,
    });
    await expect(
      transactionService.createPaymentAttempt({
        transactionId: second.transaction.id,
        amountFcfa: second.transaction.amountFcfa,
        method: "mobile_money",
        provider: "paystack",
        providerReference,
      }),
    ).rejects.toMatchObject({ code: "PAYMENT_CONFLICT" });
  }, 60_000);

  it("cancels pending attempts and rejects confirmation afterwards", async () => {
    const { transaction } = await createOrderTransaction();
    const payment = await transactionService.createPaymentAttempt({
      transactionId: transaction.id,
      amountFcfa: transaction.amountFcfa,
      method: "cash",
    });
    await transactionService.cancelTransaction(transaction.id);
    await expect(
      transactionService.confirmPayment({ paymentId: payment.id }),
    ).rejects.toMatchObject({ code: "TRANSACTION_CANCELLED" });
    const loaded = await transactionService.getTransaction(transaction.id);
    expect(loaded?.status).toBe("cancelled");
    expect(loaded?.payments[0]?.status).toBe("cancelled");
  });

  it("keeps a paid subscription request inactive until payment confirmation", async () => {
    const requestId = crypto.randomUUID();
    subscriptionRequestIds.push(requestId);
    await pool.query(
      `INSERT INTO subscription_requests (
        id, partner_account_id, plan_code, prix_fige_fcfa, statut, created_at
      ) VALUES ($1, $2, 'croissance', 25000, 'en_attente', NOW())`,
      [requestId, partnerAccountId],
    );
    const transaction = await transactionService.createTransaction({
      type: "abonnement_partenaire",
      subscriptionRequestId: requestId,
      partnerAccountId,
      amountFcfa: 25_000,
    });
    const periodCount = await pool.query(
      "SELECT count(*)::int AS count FROM subscription_periods WHERE request_id = $1",
      [requestId],
    );
    expect(transaction.status).toBe("pending");
    expect(periodCount.rows[0].count).toBe(0);
  });

  it("records a partial commission settlement without recalculating the ledger", async () => {
    const orderId = await createOrderSource(50_000);
    await pool.query(
      `INSERT INTO commissions (
        id, commande_id, partner_account_id, base_amount_fcfa,
        rate_bps_snapshot, amount_fcfa, commercial_status, collection_mode,
        due_at, created_at, updated_at
      ) VALUES ($1, $2, $3, 50000, 1000, 5000, 'due', 'cash_receivable', NOW(), NOW(), NOW())`,
      [crypto.randomUUID(), orderId, partnerAccountId],
    );
    const result = await commissionLedger.createManualCommissionSettlement({
      partnerAccountId,
      adminId: adminUserId,
      amountFcfa: 3_000,
      method: "especes",
      externalReference: `settlement-${suffix}`,
      justification: "Règlement partiel vérifié pour le test Bloc 7.",
      paidAt: new Date(),
    });
    const financial = await pool.query(
      `SELECT t.amount_fcfa, t.status, p.amount_fcfa AS payment_amount,
              p.method, p.provider, p.status AS payment_status
       FROM transactions t
       INNER JOIN payments p ON p.transaction_id = t.id
       WHERE t.commission_settlement_id = $1`,
      [result.settlement.id],
    );
    expect(result.allocations.reduce((sum, row) => sum + row.amountFcfa, 0)).toBe(3_000);
    expect(result.remainingDebt).toBe(2_000);
    expect(financial.rows[0]).toMatchObject({
      amount_fcfa: 3_000,
      status: "paid",
      payment_amount: 3_000,
      method: "cash",
      provider: null,
      payment_status: "confirmed",
    });
  }, 60_000);
});
