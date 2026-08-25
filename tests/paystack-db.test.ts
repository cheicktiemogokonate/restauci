import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { sql } from "drizzle-orm";

const enabled = process.env.RUN_PAYSTACK_DB_TESTS === "true";
const allowDevelopment = process.env.ALLOW_DEVELOPMENT_PAYSTACK_DB_TESTS === "true";
const databaseUrl = process.env.DATABASE_URL;
if (enabled && (!databaseUrl || !allowDevelopment)) {
  throw new Error("Les tests DB Paystack exigent DATABASE_URL et ALLOW_DEVELOPMENT_PAYSTACK_DB_TESTS=true");
}
const describeDb = enabled ? describe : describe.skip;

describeDb("Paystack Bloc 8 database and concurrency", () => {
  const pool = new Pool({ connectionString: databaseUrl, max: 6 });
  const suffix = crypto.randomUUID();
  const phoneSuffix = suffix.replace(/\D/g, "").slice(0, 8).padEnd(8, "0");
  const partnerUserId = crypto.randomUUID();
  const adminUserId = crypto.randomUUID();
  const partnerAccountId = crypto.randomUUID();
  const restaurantId = crypto.randomUUID();
  const clientId = crypto.randomUUID();
  const orderIds: string[] = [];
  let previousRecoveryBps = 5_000;
  let transactionService: typeof import("@/modules/transactions/server");
  let paymentService: typeof import("@/modules/transactions/payment-service");
  let ledger: typeof import("@/lib/commissions/ledger");
  let transactionalDb: typeof import("@/lib/db/transaction").transactionalDb;
  let orderMutations: typeof import("@/lib/db/commandes-mutations");

  async function insertOrder(status: "en_attente_paiement" | "servie", total = 20_000) {
    const id = crypto.randomUUID();
    orderIds.push(id);
    await pool.query(`INSERT INTO commandes (
      id, numero, restaurant_id, client_id, mode_commande, statut, nom_client,
      items, sous_total, frais_livraison, remise, total, created_at, updated_at
    ) VALUES ($1,$2,$3,$4,'emporter',$5,'Client B8','[]'::jsonb,$6,0,0,$6,NOW(),NOW())`,
    [id, `B8-${crypto.randomUUID().slice(0, 12)}`, restaurantId, clientId, status, total]);
    return id;
  }

  async function insertCommission(orderId: string, mode: "provider_split" | "cash_receivable", status: "pending" | "due", amount = 2_400) {
    await pool.query(`INSERT INTO commissions (
      id, commande_id, partner_account_id, base_amount_fcfa, rate_bps_snapshot,
      amount_fcfa, commercial_status, collection_mode, due_at, created_at, updated_at
    ) VALUES ($1,$2,$3,20000,1200,$4,$5,$6,$7,NOW(),NOW())`,
    [crypto.randomUUID(), orderId, partnerAccountId, amount, status, mode, status === "due" ? new Date() : null]);
  }

  beforeAll(async () => {
    transactionService = await import("@/modules/transactions/server");
    paymentService = await import("@/modules/transactions/payment-service");
    ledger = await import("@/lib/commissions/ledger");
    transactionalDb = (await import("@/lib/db/transaction")).transactionalDb;
    orderMutations = await import("@/lib/db/commandes-mutations");
    const policy = await pool.query("SELECT cash_debt_recovery_max_bps FROM commission_policy_settings WHERE id=1");
    previousRecoveryBps = policy.rows[0]?.cash_debt_recovery_max_bps ?? 5_000;
    await pool.query("UPDATE commission_policy_settings SET cash_debt_recovery_max_bps=5000 WHERE id=1");
    await pool.query(`INSERT INTO users (id,nom,email,password,telephone,role,created_at,updated_at) VALUES
      ($1,'Partner B8',$2,'x',$5,'partner',NOW(),NOW()),
      ($3,'Admin B8',$4,'x',$6,'admin',NOW(),NOW())`,
      [partnerUserId, `partner-${suffix}@example.test`, adminUserId, `admin-${suffix}@example.test`, `+22511${phoneSuffix}`, `+22522${phoneSuffix}`]);
    await pool.query("INSERT INTO partner_accounts (id,user_id,activity_type,created_at,updated_at) VALUES ($1,$2,'restaurant',NOW(),NOW())", [partnerAccountId, partnerUserId]);
    await pool.query(`INSERT INTO restaurants (id,partner_account_id,nom,slug,telephone,adresse,latitude,longitude,created_at,updated_at)
      VALUES ($1,$2,'Restaurant B8',$3,$4,'Test',0,0,NOW(),NOW())`, [restaurantId, partnerAccountId, `restaurant-${suffix}`, `+22533${phoneSuffix}`]);
    await pool.query("INSERT INTO clients (id,nom,telephone,password,actif,created_at,updated_at) VALUES ($1,'Client B8',$2,'x',true,NOW(),NOW())", [clientId, `+22544${phoneSuffix}`]);
    await pool.query(`INSERT INTO payment_provider_accounts (
      id,partner_account_id,provider,provider_account_reference,status,verified_at,linked_by_admin_id,created_at,updated_at
    ) VALUES ($1,$2,'paystack',$3,'active',NOW(),$4,NOW(),NOW())`, [crypto.randomUUID(), partnerAccountId, `ACCT${suffix.replaceAll("-", "")}`, adminUserId]);
  }, 60_000);

  afterAll(async () => {
    await pool.query("DELETE FROM audit_log WHERE ressource_id=$1", [partnerAccountId]);
    await pool.query("DELETE FROM payments WHERE transaction_id IN (SELECT id FROM transactions WHERE partner_account_id=$1)", [partnerAccountId]);
    await pool.query("DELETE FROM transactions WHERE partner_account_id=$1", [partnerAccountId]);
    await pool.query("DELETE FROM commission_settlement_allocations WHERE settlement_id IN (SELECT id FROM commission_settlements WHERE partner_account_id=$1)", [partnerAccountId]);
    await pool.query("DELETE FROM commission_settlements WHERE partner_account_id=$1", [partnerAccountId]);
    await pool.query("DELETE FROM commissions WHERE partner_account_id=$1", [partnerAccountId]);
    await pool.query("DELETE FROM payment_provider_accounts WHERE partner_account_id=$1", [partnerAccountId]);
    await pool.query("DELETE FROM commandes WHERE id=ANY($1::varchar[])", [orderIds]);
    await pool.query("DELETE FROM clients WHERE id=$1", [clientId]);
    await pool.query("DELETE FROM restaurants WHERE id=$1", [restaurantId]);
    await pool.query("DELETE FROM partner_accounts WHERE id=$1", [partnerAccountId]);
    await pool.query("DELETE FROM users WHERE id=ANY($1::varchar[])", [[partnerUserId, adminUserId]]);
    await pool.query("UPDATE commission_policy_settings SET cash_debt_recovery_max_bps=$1 WHERE id=1", [previousRecoveryBps]);
    await pool.end();
  }, 60_000);

  it("finalise webhook et verify concurrents avec un seul effet métier", async () => {
    const orderId = await insertOrder("en_attente_paiement");
    await insertCommission(orderId, "provider_split", "pending");
    const transaction = await transactionService.createTransaction({ type: "commande_restaurant", restaurantOrderId: orderId, partnerAccountId, clientId, amountFcfa: 20_000 });
    const payment = await transactionService.createPaymentAttempt({ transactionId: transaction.id, amountFcfa: 20_000, method: "mobile_money", provider: "paystack", providerReference: `b8-concurrent-${suffix}` });
    const verified = { reference: payment.providerReference!, status: "success" as const, amountFcfa: 20_000, currency: "XOF", network: "wave" as const };
    const results = await Promise.all([
      paymentService.confirmProviderPayment(verified),
      paymentService.confirmProviderPayment(verified),
    ]);
    expect(results.filter((result) => !result.alreadyConfirmed)).toHaveLength(1);
    expect(results.filter((result) => result.alreadyConfirmed)).toHaveLength(1);
    const state = await pool.query("SELECT c.statut,t.status,p.status AS payment_status FROM commandes c JOIN transactions t ON t.restaurant_order_id=c.id JOIN payments p ON p.transaction_id=t.id WHERE c.id=$1", [orderId]);
    expect(state.rows[0]).toMatchObject({ statut: "recue", status: "paid", payment_status: "confirmed" });
    await expect(transactionalDb.transaction((tx) => orderMutations.applyRestaurantOrderTransition(tx, {
      id: orderId,
      targetStatus: "annulee",
      allowedPreviousStatuses: ["recue"],
    }))).rejects.toMatchObject({ code: "TRANSACTION_ALREADY_PAID" });
    const unchanged = await pool.query("SELECT statut FROM commandes WHERE id=$1", [orderId]);
    expect(unchanged.rows[0].statut).toBe("recue");
  }, 60_000);

  it("refuse montant et devise incohérents sans effet financier", async () => {
    const orderId = await insertOrder("en_attente_paiement", 15_000);
    await insertCommission(orderId, "provider_split", "pending", 1_800);
    const transaction = await transactionService.createTransaction({ type: "commande_restaurant", restaurantOrderId: orderId, partnerAccountId, clientId, amountFcfa: 15_000 });
    const payment = await transactionService.createPaymentAttempt({ transactionId: transaction.id, amountFcfa: 15_000, method: "card", provider: "paystack", providerReference: `b8-mismatch-${suffix}` });
    await expect(paymentService.confirmProviderPayment({ reference: payment.providerReference!, status: "success", amountFcfa: 14_999, currency: "XOF", network: null })).rejects.toMatchObject({ code: "AMOUNT_MISMATCH" });
    await expect(paymentService.confirmProviderPayment({ reference: payment.providerReference!, status: "success", amountFcfa: 15_000, currency: "USD", network: null })).rejects.toMatchObject({ code: "CURRENCY_MISMATCH" });
    const state = await pool.query("SELECT status FROM transactions WHERE id=$1", [transaction.id]);
    expect(state.rows[0].status).toBe("pending");
  }, 60_000);

  it("empêche recovery et règlement direct concurrents de réserver plus que la dette", async () => {
    for (let index = 0; index < 2; index += 1) {
      const orderId = await insertOrder("servie", 50_000);
      await insertCommission(orderId, "cash_receivable", "due", 5_000);
    }
    const results = await Promise.allSettled([
      transactionalDb.transaction(async (tx) => {
        await tx.execute(sql`SELECT id FROM partner_accounts WHERE id = ${partnerAccountId} FOR UPDATE`);
        return ledger.reserveOrderRecoveryInTransaction(tx, {
          partnerAccountId,
          normalPartnerNetFcfa: 10_000,
          reservationReference: `recovery-concurrent-${suffix}`,
        });
      }),
      ledger.preparePaystackCommissionSettlement({ partnerAccountId, amountFcfa: 7_000 }),
    ]);
    expect(results.some((result) => result.status === "fulfilled")).toBe(true);
    const reserved = await pool.query("SELECT COALESCE(SUM(montant_fcfa),0)::int AS amount FROM commission_settlements WHERE partner_account_id=$1 AND statut='pending'", [partnerAccountId]);
    expect(reserved.rows[0].amount).toBeLessThanOrEqual(10_000);
  }, 60_000);

  it("annule avant paiement et libère atomiquement la réservation recovery", async () => {
    const debtOrderId = await insertOrder("servie", 10_000);
    await insertCommission(debtOrderId, "cash_receivable", "due", 1_000);
    const orderId = await insertOrder("en_attente_paiement");
    await insertCommission(orderId, "provider_split", "pending");
    const transaction = await transactionService.createTransaction({ type: "commande_restaurant", restaurantOrderId: orderId, partnerAccountId, clientId, amountFcfa: 20_000 });
    const recovery = await transactionalDb.transaction(async (tx) => {
      await tx.execute(sql`SELECT id FROM partner_accounts WHERE id = ${partnerAccountId} FOR UPDATE`);
      return ledger.reserveOrderRecoveryInTransaction(tx, { partnerAccountId, normalPartnerNetFcfa: 17_600, reservationReference: `cancel-recovery-${suffix}` });
    });
    expect(recovery).not.toBeNull();
    await transactionService.createPaymentAttempt({
      transactionId: transaction.id,
      amountFcfa: 20_000,
      method: "mobile_money",
      provider: "paystack",
      providerReference: `cancel-payment-${suffix}`,
      recoverySettlementId: recovery!.id,
    });
    await transactionalDb.transaction((tx) => orderMutations.applyRestaurantOrderTransition(tx, {
      id: orderId,
      targetStatus: "annulee",
      allowedPreviousStatuses: ["en_attente_paiement"],
    }));
    const state = await pool.query("SELECT c.statut,t.status,p.status AS payment_status,s.statut AS settlement_status,cm.commercial_status FROM commandes c JOIN transactions t ON t.restaurant_order_id=c.id JOIN payments p ON p.transaction_id=t.id JOIN commission_settlements s ON s.id=p.recovery_settlement_id JOIN commissions cm ON cm.commande_id=c.id WHERE c.id=$1", [orderId]);
    expect(state.rows[0]).toMatchObject({ statut: "annulee", status: "cancelled", payment_status: "cancelled", settlement_status: "failed", commercial_status: "void" });
  }, 60_000);

  it("applique les unicités du provider account", async () => {
    await expect(pool.query(`INSERT INTO payment_provider_accounts (
      id,partner_account_id,provider,provider_account_reference,status,verified_at,linked_by_admin_id,created_at,updated_at
    ) VALUES ($1,$2,'paystack',$3,'active',NOW(),$4,NOW(),NOW())`, [crypto.randomUUID(), partnerAccountId, `ACCT_duplicate_${suffix}`, adminUserId])).rejects.toMatchObject({ code: "23505" });
  });
});
