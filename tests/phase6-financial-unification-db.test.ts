import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import {
  warmApplicationDatabaseConnections,
  warmNeonTestPool,
} from "./support/neon-test-connection";

const enabled = process.env.RUN_PHASE6_DB_TESTS === "true";
const allowDevelopment =
  process.env.ALLOW_DEVELOPMENT_PHASE6_DB_TESTS === "true";
const databaseUrl = process.env.DATABASE_URL;
if (enabled && (!databaseUrl || !allowDevelopment)) {
  throw new Error(
    "Les tests DB Phase 6 exigent DATABASE_URL et ALLOW_DEVELOPMENT_PHASE6_DB_TESTS=true",
  );
}
const describeDb = enabled ? describe : describe.skip;

describeDb("phase 6 financial unification", () => {
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 2,
    connectionTimeoutMillis: 30_000,
    idleTimeoutMillis: 60_000,
    keepAlive: true,
  });
  const suffix = crypto.randomUUID();
  const adminId = crypto.randomUUID();
  const partnerUserIds = [crypto.randomUUID(), crypto.randomUUID()];
  const partnerAccountIds = [crypto.randomUUID(), crypto.randomUUID()];
  let subscriptions: typeof import("@/modules/subscriptions/server");
  let transactions: typeof import("@/modules/transactions/server");
  let paymentService: typeof import("@/modules/payments/server");
  let onlinePaymentId: string;
  let onlinePeriodId: string;

  beforeAll(async () => {
    await warmNeonTestPool(pool);
    subscriptions = await import("@/modules/subscriptions/server");
    transactions = await import("@/modules/transactions/server");
    paymentService = await import("@/modules/payments/server");
    await warmApplicationDatabaseConnections();
    await pool.query(
      `INSERT INTO users (id, nom, email, password, telephone, role, created_at, updated_at)
       VALUES
       ($1, 'Admin Phase 6', $2, 'x', $3, 'admin', NOW(), NOW()),
       ($4, 'Partenaire Phase 6 A', $5, 'x', $6, 'partner', NOW(), NOW()),
       ($7, 'Partenaire Phase 6 B', $8, 'x', $9, 'partner', NOW(), NOW())`,
      [
        adminId,
        `admin-phase6-${suffix}@example.test`,
        `+22501${suffix.replaceAll("-", "").slice(0, 8)}`,
        partnerUserIds[0],
        `partner-a-phase6-${suffix}@example.test`,
        `+22502${suffix.replaceAll("-", "").slice(0, 8)}`,
        partnerUserIds[1],
        `partner-b-phase6-${suffix}@example.test`,
        `+22503${suffix.replaceAll("-", "").slice(0, 8)}`,
      ],
    );
    await pool.query(
      `INSERT INTO partner_accounts (id, user_id, activity_type, created_at, updated_at)
       VALUES ($1, $2, 'residence', NOW(), NOW()), ($3, $4, 'residence', NOW(), NOW())`,
      [
        partnerAccountIds[0],
        partnerUserIds[0],
        partnerAccountIds[1],
        partnerUserIds[1],
      ],
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
        "DELETE FROM financial_journal_entries WHERE partner_account_id = ANY($1::uuid[])",
        [partnerAccountIds],
      );
      await client.query(
        "DELETE FROM transactions WHERE type::text = 'remboursement' AND partner_account_id = ANY($1::uuid[])",
        [partnerAccountIds],
      );
      await client.query(
        "DELETE FROM payments WHERE transaction_id IN (SELECT id FROM transactions WHERE partner_account_id = ANY($1::uuid[]))",
        [partnerAccountIds],
      );
      await client.query(
        "DELETE FROM transactions WHERE partner_account_id = ANY($1::uuid[])",
        [partnerAccountIds],
      );
      await client.query(
        "DELETE FROM notifications WHERE user_id = ANY($1::varchar[])",
        [partnerUserIds],
      );
      await client.query(
        "DELETE FROM event_effect_receipts WHERE event_id IN (SELECT id FROM business_events WHERE partner_account_id = ANY($1::uuid[]))",
        [partnerAccountIds],
      );
      await client.query(
        "DELETE FROM outbox_messages WHERE event_id IN (SELECT id FROM business_events WHERE partner_account_id = ANY($1::uuid[]))",
        [partnerAccountIds],
      );
      await client.query(
        "DELETE FROM audit_log WHERE partner_account_id = ANY($1::uuid[]) OR ressource_id = ANY($2::text[])",
        [partnerAccountIds, partnerAccountIds],
      );
      await client.query(
        "DELETE FROM business_events WHERE partner_account_id = ANY($1::uuid[])",
        [partnerAccountIds],
      );
      await client.query(
        "DELETE FROM subscription_period_limits WHERE subscription_period_id IN (SELECT id FROM subscription_periods WHERE partner_account_id = ANY($1::uuid[]))",
        [partnerAccountIds],
      );
      await client.query(
        "DELETE FROM subscription_periods WHERE partner_account_id = ANY($1::uuid[])",
        [partnerAccountIds],
      );
      await client.query(
        "DELETE FROM subscription_requests WHERE partner_account_id = ANY($1::uuid[])",
        [partnerAccountIds],
      );
      await client.query(
        "DELETE FROM partner_accounts WHERE id = ANY($1::uuid[])",
        [partnerAccountIds],
      );
      await client.query(
        "DELETE FROM users WHERE id = ANY($1::varchar[])",
        [[adminId, ...partnerUserIds]],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
      await pool.end();
    }
  }, 90_000);

  it("finalizes Paystack atomically and idempotently", async () => {
    const prepared = await subscriptions.createPartnerSubscriptionRequest({
      partnerAccountId: partnerAccountIds[0]!,
      planCode: "croissance",
    });
    expect(prepared.paymentId).toBeTruthy();
    onlinePaymentId = prepared.paymentId!;

    const payment = await pool.query(
      `SELECT provider_reference, amount_fcfa
       FROM payments WHERE id = $1`,
      [onlinePaymentId],
    );
    const verified = {
      reference: payment.rows[0].provider_reference as string,
      status: "success" as const,
      amountFcfa: Number(payment.rows[0].amount_fcfa),
      currency: "XOF",
      network: "wave" as const,
    };
    const first = await paymentService.confirmProviderPayment(verified);
    const replay = await paymentService.confirmProviderPayment(verified);
    expect(first).toMatchObject({
      status: "confirmed",
      alreadyConfirmed: false,
      transactionType: "abonnement_partenaire",
    });
    expect(replay).toMatchObject({
      status: "confirmed",
      alreadyConfirmed: true,
    });

    const state = await pool.query(
      `SELECT
         t.status::text AS transaction_status,
         p.status::text AS payment_status,
         sp.statut::text AS period_status,
         COUNT(DISTINCT spl.id)::int AS limit_count,
         COUNT(DISTINCT fje.id)::int AS journal_count,
         COUNT(DISTINCT be.id)::int AS event_count,
         COUNT(DISTINCT om.id)::int AS audit_effect_count,
         COUNT(DISTINCT n.id)::int AS notification_count,
         MAX(be.actor_type::text) AS actor_type
       FROM payments p
       JOIN transactions t ON t.id = p.transaction_id
       JOIN subscription_periods sp ON sp.request_id = t.subscription_request_id
       JOIN subscription_period_limits spl ON spl.subscription_period_id = sp.id
       LEFT JOIN financial_journal_entries fje ON fje.payment_id = p.id
       LEFT JOIN business_events be ON be.id = fje.event_id
       LEFT JOIN outbox_messages om ON om.event_id = be.id AND om.effect_type = 'audit.project'
       LEFT JOIN notifications n ON n.lien_id = sp.id AND n.user_id = $2
       WHERE p.id = $1
       GROUP BY t.status, p.status, sp.statut`,
      [onlinePaymentId, partnerUserIds[0]],
    );
    expect(state.rows[0]).toMatchObject({
      transaction_status: "paid",
      payment_status: "confirmed",
      period_status: "active",
      limit_count: 1,
      journal_count: 1,
      event_count: 1,
      audit_effect_count: 1,
      notification_count: 1,
      actor_type: "provider",
    });
    const [createdPeriod] = await pool.query(
      "SELECT id FROM subscription_periods WHERE request_id = $1",
      [prepared.requestId],
    ).then((result) => result.rows);
    onlinePeriodId = createdPeriod.id;
  }, 60_000);

  it("produces the same entitlement through an offline admin payment", async () => {
    const prepared = await subscriptions.createPartnerSubscriptionRequest({
      partnerAccountId: partnerAccountIds[1]!,
      planCode: "croissance",
    });
    const first = await subscriptions.validateOfflineSubscriptionRequest(adminId, {
      requestId: prepared.requestId,
      paymentMethod: "virement",
      paymentReference: `VIR-${suffix}`,
    });
    const replay = await subscriptions.validateOfflineSubscriptionRequest(adminId, {
      requestId: prepared.requestId,
      paymentMethod: "virement",
      paymentReference: `VIR-${suffix}`,
    });
    expect(first.alreadyFinalized).toBe(false);
    expect(replay).toMatchObject({
      alreadyFinalized: true,
      periodId: first.periodId,
    });

    const state = await pool.query(
      `SELECT
         t.status::text AS transaction_status,
         p.status::text AS payment_status,
         p.recorded_reference,
         sp.statut::text AS period_status,
         COUNT(DISTINCT spl.id)::int AS limit_count,
         COUNT(DISTINCT fje.id)::int AS journal_count,
         MAX(fje.channel::text) AS channel,
         MAX(be.actor_type::text) AS actor_type
       FROM transactions t
       JOIN payments p ON p.transaction_id = t.id
       JOIN subscription_periods sp ON sp.request_id = t.subscription_request_id
       JOIN subscription_period_limits spl ON spl.subscription_period_id = sp.id
       LEFT JOIN financial_journal_entries fje ON fje.payment_id = p.id
       LEFT JOIN business_events be ON be.id = fje.event_id
       WHERE t.subscription_request_id = $1
         AND p.status::text = 'confirmed'
       GROUP BY t.status, p.status, p.recorded_reference, sp.statut`,
      [prepared.requestId],
    );
    expect(state.rows[0]).toMatchObject({
      transaction_status: "paid",
      payment_status: "confirmed",
      recorded_reference: `VIR-${suffix}`,
      period_status: "active",
      limit_count: 1,
      journal_count: 1,
      channel: "offline",
      actor_type: "admin",
    });
    const attempts = await pool.query(
      `SELECT provider, status::text AS status
       FROM payments
       WHERE transaction_id = (
         SELECT id FROM transactions WHERE subscription_request_id = $1
       )
       ORDER BY created_at`,
      [prepared.requestId],
    );
    expect(attempts.rows).toEqual([
      { provider: "paystack", status: "cancelled" },
      { provider: null, status: "confirmed" },
    ]);
  }, 60_000);

  it("keeps obligations and entitlements on their source account", async () => {
    const requestId = crypto.randomUUID();
    await pool.query(
      `INSERT INTO subscription_requests (
         id, partner_account_id, plan_code, prix_fige_fcfa, statut, created_at
       ) VALUES ($1, $2, 'croissance', 25000, 'en_attente', NOW())`,
      [requestId, partnerAccountIds[0]],
    );
    await expect(
      transactions.createTransaction({
        type: "abonnement_partenaire",
        subscriptionRequestId: requestId,
        partnerAccountId: partnerAccountIds[1]!,
        amountFcfa: 25_000,
      }),
    ).rejects.toBeTruthy();
  });

  it("creates a real, bounded and idempotent refund obligation", async () => {
    const first = await transactions.createRefundObligation({
      originalPaymentId: onlinePaymentId,
      amountFcfa: 10_000,
      refundIdempotencyKey: `refund:${suffix}:1`,
      actor: { type: "admin", id: adminId },
    });
    const replay = await transactions.createRefundObligation({
      originalPaymentId: onlinePaymentId,
      amountFcfa: 10_000,
      refundIdempotencyKey: `refund:${suffix}:1`,
      actor: { type: "admin", id: adminId },
    });
    expect(first.alreadyCreated).toBe(false);
    expect(replay).toMatchObject({
      alreadyCreated: true,
      transaction: { id: first.transaction.id },
    });
    await expect(
      transactions.createRefundObligation({
        originalPaymentId: onlinePaymentId,
        amountFcfa: 15_001,
        refundIdempotencyKey: `refund:${suffix}:2`,
        actor: { type: "admin", id: adminId },
      }),
    ).rejects.toMatchObject({ code: "REFUND_LIMIT_EXCEEDED" });

    const state = await pool.query(
      `SELECT
         t.type::text AS type,
         t.status::text AS status,
         t.original_payment_id,
         t.partner_account_id,
         fje.direction::text AS direction,
         be.actor_type::text AS actor_type,
         COUNT(om.id)::int AS audit_effect_count
       FROM transactions t
       JOIN financial_journal_entries fje ON fje.transaction_id = t.id
       JOIN business_events be ON be.id = fje.event_id
       JOIN outbox_messages om ON om.event_id = be.id AND om.effect_type = 'audit.project'
       WHERE t.id = $1
       GROUP BY t.type, t.status, t.original_payment_id, t.partner_account_id,
         fje.direction, be.actor_type`,
      [first.transaction.id],
    );
    expect(state.rows[0]).toMatchObject({
      type: "remboursement",
      status: "pending",
      original_payment_id: onlinePaymentId,
      partner_account_id: partnerAccountIds[0],
      direction: "outflow",
      actor_type: "admin",
      audit_effect_count: 1,
    });
  }, 60_000);

  it("expires a suspended period with the system actor", async () => {
    await subscriptions.suspendPartnerSubscription(adminId, {
      partnerAccountId: partnerAccountIds[0]!,
      reason: "Contrôle de cycle de vie Phase 6",
    });
    await pool.query(
      `UPDATE subscription_periods
       SET date_debut = NOW() - INTERVAL '2 years',
           date_echeance = NOW() - INTERVAL '1 day'
       WHERE id = $1`,
      [onlinePeriodId],
    );
    const result = await subscriptions.reactivatePartnerSubscription(
      adminId,
      partnerAccountIds[0]!,
    );
    expect(result.reactivated).toBe(false);
    const event = await pool.query(
      `SELECT sp.statut::text AS status, be.actor_type::text, be.actor_id
       FROM subscription_periods sp
       JOIN business_events be
         ON be.target_id = sp.id AND be.type = 'subscription.period.expired.v1'
       WHERE sp.id = $1`,
      [onlinePeriodId],
    );
    expect(event.rows[0]).toMatchObject({
      status: "expiree",
      actor_type: "system",
      actor_id: "toutci:subscription-lifecycle",
    });
  }, 60_000);
});
