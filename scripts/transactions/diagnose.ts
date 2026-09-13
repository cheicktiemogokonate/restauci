import { migrationPool } from "../../drizzle/db-pool.ts";

const client = await migrationPool.connect();

try {
  await client.query("BEGIN READ ONLY");
  const [candidateResult, anomalyResult] = await Promise.all([
    client.query(`
      SELECT
        t.id AS transaction_id,
        t.type::text AS transaction_type,
        t.status::text AS transaction_status,
        t.partner_account_id,
        t.amount_fcfa,
        t.currency,
        COALESCE(
          t.restaurant_order_id,
          t.subscription_request_id,
          t.commission_settlement_id,
          t.residence_reservation_id::text,
          t.original_payment_id
        ) AS source_id,
        t.created_at,
        sp.id AS subscription_period_id,
        sp.plan_code::text AS created_plan_code,
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'id', p.id,
              'status', p.status,
              'provider', p.provider,
              'method', p.method,
              'providerReference', p.provider_reference,
              'recordedReference', p.recorded_reference,
              'confirmedAt', p.confirmed_at,
              'createdAt', p.created_at
            ) ORDER BY p.created_at
          ) FILTER (WHERE p.id IS NOT NULL),
          '[]'::jsonb
        ) AS payment_attempts
      FROM transactions t
      LEFT JOIN payments p ON p.transaction_id = t.id
      LEFT JOIN subscription_periods sp
        ON sp.request_id = t.subscription_request_id
      WHERE t.amount_fcfa = 25000 OR p.amount_fcfa = 25000
      GROUP BY t.id, sp.id, sp.plan_code
      ORDER BY t.created_at DESC
      LIMIT 100
    `),
    client.query(`
      SELECT
        (SELECT COUNT(*)::int
         FROM transactions t
         LEFT JOIN subscription_requests sr ON sr.id = t.subscription_request_id
         WHERE t.type::text = 'abonnement_partenaire'
           AND sr.id IS NULL) AS orphan_subscription_transactions,
        (SELECT COUNT(*)::int
         FROM transactions t
         JOIN subscription_requests sr ON sr.id = t.subscription_request_id
         WHERE t.type::text = 'abonnement_partenaire'
           AND t.partner_account_id <> sr.partner_account_id) AS crossed_subscription_transactions,
        (SELECT COUNT(*)::int
         FROM transactions t
         LEFT JOIN payments p
           ON p.transaction_id = t.id AND p.status::text = 'confirmed'
         WHERE t.status::text = 'paid'
         GROUP BY t.id
         HAVING COUNT(p.id) <> 1
         LIMIT 1) IS NOT NULL AS has_paid_transaction_without_single_payment,
        (SELECT COUNT(*)::int
         FROM payments p
         JOIN transactions t ON t.id = p.transaction_id
         WHERE p.status::text = 'confirmed'
           AND t.status::text <> 'paid') AS confirmed_payments_on_unpaid_transactions,
        (SELECT COUNT(*)::int
         FROM subscription_requests sr
         JOIN transactions t ON t.subscription_request_id = sr.id
         LEFT JOIN subscription_periods sp ON sp.request_id = sr.id
         WHERE sr.prix_fige_fcfa > 0
           AND sr.statut::text = 'validee'
           AND t.status::text = 'paid'
           AND sp.id IS NULL) AS paid_subscriptions_without_period,
        (SELECT COUNT(*)::int
         FROM subscription_periods sp
         JOIN subscription_requests sr ON sr.id = sp.request_id
         WHERE sp.partner_account_id <> sr.partner_account_id) AS crossed_subscription_periods,
        (SELECT COUNT(*)::int
         FROM subscription_periods sp
         JOIN subscription_requests sr ON sr.id = sp.request_id
         WHERE sr.prix_fige_fcfa > 0
           AND NOT EXISTS (
             SELECT 1
             FROM transactions t
             JOIN payments p ON p.transaction_id = t.id
             WHERE t.subscription_request_id = sr.id
               AND t.partner_account_id = sp.partner_account_id
               AND t.status::text = 'paid'
               AND p.status::text = 'confirmed'
           )) AS paid_periods_without_confirmed_payment,
        (SELECT COUNT(*)::int
         FROM transactions refund
         LEFT JOIN payments original_payment ON original_payment.id = refund.original_payment_id
         LEFT JOIN transactions original_transaction
           ON original_transaction.id = original_payment.transaction_id
         WHERE refund.type::text = 'remboursement'
           AND (
             original_payment.id IS NULL
             OR original_payment.status::text <> 'confirmed'
             OR original_transaction.type::text = 'remboursement'
             OR original_transaction.partner_account_id <> refund.partner_account_id
           )) AS invalid_refund_sources,
        (SELECT COUNT(*)::int
         FROM (
           SELECT refund.original_payment_id
           FROM transactions refund
           JOIN payments original_payment ON original_payment.id = refund.original_payment_id
           WHERE refund.type::text = 'remboursement'
             AND refund.status::text <> 'cancelled'
           GROUP BY refund.original_payment_id, original_payment.amount_fcfa
           HAVING SUM(refund.amount_fcfa) > original_payment.amount_fcfa
         ) excessive_refunds) AS over_refunded_payments
    `),
  ]);
  await client.query("COMMIT");

  const anomalyRow = anomalyResult.rows[0] ?? {};
  const anomalies = {
    orphanSubscriptionTransactions: Number(
      anomalyRow.orphan_subscription_transactions ?? 0,
    ),
    crossedSubscriptionTransactions: Number(
      anomalyRow.crossed_subscription_transactions ?? 0,
    ),
    paidTransactionWithoutSinglePayment: Boolean(
      anomalyRow.has_paid_transaction_without_single_payment,
    ),
    confirmedPaymentsOnUnpaidTransactions: Number(
      anomalyRow.confirmed_payments_on_unpaid_transactions ?? 0,
    ),
    paidSubscriptionsWithoutPeriod: Number(
      anomalyRow.paid_subscriptions_without_period ?? 0,
    ),
    crossedSubscriptionPeriods: Number(
      anomalyRow.crossed_subscription_periods ?? 0,
    ),
    paidPeriodsWithoutConfirmedPayment: Number(
      anomalyRow.paid_periods_without_confirmed_payment ?? 0,
    ),
    invalidRefundSources: Number(anomalyRow.invalid_refund_sources ?? 0),
    overRefundedPayments: Number(anomalyRow.over_refunded_payments ?? 0),
  };
  console.log(
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        mode: "read-only",
        amountInvestigatedFcfa: 25_000,
        candidates: candidateResult.rows,
        anomalies,
      },
      null,
      2,
    ),
  );
  if (
    Object.values(anomalies).some((value) =>
      typeof value === "boolean" ? value : value > 0,
    )
  ) {
    process.exitCode = 2;
  }
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  throw error;
} finally {
  client.release();
  await migrationPool.end();
}
