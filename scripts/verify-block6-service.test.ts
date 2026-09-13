import { afterAll, describe, expect, it } from "vitest";
import { Pool } from "pg";

const enabled = process.env.RUN_BLOCK6_DB_TEST === "true";
const pool = enabled && process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null;
const createdCommissionIds: string[] = [];
const references: string[] = [];
let partnerAccountId = "";

describe.skipIf(!enabled)("services financiers Bloc 6", () => {
  afterAll(async () => {
    if (!pool || !partnerAccountId) return;
    await pool.query("DELETE FROM payments WHERE transaction_id IN (SELECT id FROM transactions WHERE commission_settlement_id IN (SELECT id FROM commission_settlements WHERE reference_externe = ANY($1)))", [references]);
    await pool.query("DELETE FROM transactions WHERE commission_settlement_id IN (SELECT id FROM commission_settlements WHERE reference_externe = ANY($1))", [references]);
    await pool.query("DELETE FROM commission_settlement_allocations WHERE settlement_id IN (SELECT id FROM commission_settlements WHERE reference_externe = ANY($1))", [references]);
    await pool.query("DELETE FROM commission_settlements WHERE reference_externe = ANY($1)", [references]);
    await pool.query("DELETE FROM commission_debt_cycles WHERE partner_account_id = $1", [partnerAccountId]);
    await pool.query("DELETE FROM commissions WHERE id = ANY($1)", [createdCommissionIds]);
    await pool.query("DELETE FROM audit_log WHERE action = 'commissions_encaissees' AND details->>'externalReference' = ANY($1)", [references]);
    await pool.end();
  });

  it("snapshotte, active, exclut provider, annule, alloue FIFO et clôture le cycle", async () => {
    if (!pool) throw new Error("Pool indisponible");
    const { transactionalDb } = await import("@/infrastructure/db/transaction");
    const {
      createCommissionSnapshot,
      createManualCommissionSettlement,
      getCashCommissionStatus,
      getOutstandingCashCommissionDebt,
      transitionCommissionForOrder,
    } = await import("@/modules/commissions/server");
    const context = await pool.query<{
      partner_account_id: string;
      admin_id: string;
      order_ids: string[];
      rate_bps: number;
      threshold: number;
      restaurant_id: string;
      suspended: boolean;
    }>(`
      WITH eligible AS (
        SELECT r.partner_account_id, r.id AS restaurant_id, r.suspendu AS suspended,
          ARRAY_AGG(c.id ORDER BY c.created_at) FILTER (WHERE co.id IS NULL) AS order_ids
        FROM restaurants r JOIN commandes c ON c.restaurant_id = r.id
        LEFT JOIN commissions co ON co.commande_id = c.id
        GROUP BY r.partner_account_id, r.id, r.suspendu
        HAVING COUNT(c.id) FILTER (WHERE co.id IS NULL) >= 4
        LIMIT 1
      )
      SELECT e.*, a.id AS admin_id, p.cash_debt_threshold_fcfa AS threshold,
        COALESCE((SELECT sp.taux_commission_bps_fige FROM subscription_periods sp
          WHERE sp.partner_account_id = e.partner_account_id AND sp.statut = 'active'
            AND sp.plan_code <> 'decouverte' AND sp.date_debut <= NOW() AND sp.date_echeance > NOW()
          ORDER BY sp.date_debut DESC LIMIT 1),
          (SELECT taux_commission_bps FROM subscription_plans WHERE code = 'decouverte')) AS rate_bps
      FROM eligible e CROSS JOIN LATERAL (SELECT id FROM users WHERE role = 'admin' LIMIT 1) a
      CROSS JOIN commission_policy_settings p WHERE p.id = 1
    `);
    const row = context.rows[0];
    if (!row || row.rate_bps <= 0) throw new Error("Jeu de données Bloc 6 insuffisant");
    partnerAccountId = row.partner_account_id;
    const [cashOrder, thresholdOrder, providerOrder, cancelledOrder] = row.order_ids;
    const crossingBase = Math.ceil(((row.threshold + 1_000) * 10_000) / row.rate_bps);

    const snapshots = await transactionalDb.transaction(async (tx) => {
      const result = [];
      result.push(await createCommissionSnapshot(tx, { orderId: cashOrder, partnerAccountId, baseAmountFcfa: 21_500, collectionMode: "cash_receivable" }));
      result.push(await createCommissionSnapshot(tx, { orderId: thresholdOrder, partnerAccountId, baseAmountFcfa: crossingBase, collectionMode: "cash_receivable" }));
      result.push(await createCommissionSnapshot(tx, { orderId: providerOrder, partnerAccountId, baseAmountFcfa: 50_000, collectionMode: "provider_split" }));
      result.push(await createCommissionSnapshot(tx, { orderId: cancelledOrder, partnerAccountId, baseAmountFcfa: 20_000, collectionMode: "cash_receivable" }));
      return result;
    });
    createdCommissionIds.push(...snapshots.map((snapshot) => snapshot.id));
    expect(snapshots[0]).toMatchObject({ baseAmountFcfa: 21_500, rateBpsSnapshot: row.rate_bps });

    await transactionalDb.transaction(async (tx) => {
      await transitionCommissionForOrder(tx, cashOrder, "servie", new Date());
      await transitionCommissionForOrder(tx, thresholdOrder, "servie", new Date());
      await transitionCommissionForOrder(tx, providerOrder, "servie", new Date());
      await transitionCommissionForOrder(tx, cancelledOrder, "annulee", new Date());
    });
    const cashDebt = snapshots[0].amountFcfa + snapshots[1].amountFcfa;
    expect(await getOutstandingCashCommissionDebt(partnerAccountId)).toBe(cashDebt);
    await transactionalDb.transaction(async (tx) => {
      const replay = await transitionCommissionForOrder(tx, thresholdOrder, "servie", new Date());
      expect(replay.commission.id).toBe(snapshots[1].id);
    });
    expect(await getOutstandingCashCommissionDebt(partnerAccountId)).toBe(cashDebt);
    expect((await getCashCommissionStatus(partnerAccountId)).cycle).not.toBeNull();

    await pool.query("UPDATE commission_debt_cycles SET triggered_at = NOW() - INTERVAL '8 days' WHERE partner_account_id = $1 AND closed_at IS NULL", [partnerAccountId]);
    expect((await getCashCommissionStatus(partnerAccountId)).cashAllowed).toBe(false);
    const restaurant = await pool.query<{ suspendu: boolean }>("SELECT suspendu FROM restaurants WHERE id = $1", [row.restaurant_id]);
    expect(restaurant.rows[0]?.suspendu).toBe(row.suspended);

    const partialAmount = Math.min(cashDebt - 1, snapshots[0].amountFcfa + 1_000);
    const partialReference = `BLOCK6-SERVICE-PARTIAL-${Date.now()}`;
    references.push(partialReference);
    const partial = await createManualCommissionSettlement({ partnerAccountId, adminId: row.admin_id, amountFcfa: partialAmount, method: "virement", externalReference: partialReference, justification: "Test automatique du règlement partiel FIFO", paidAt: new Date() });
    expect(partial.allocations[0]).toEqual({ commissionId: snapshots[0].id, amountFcfa: snapshots[0].amountFcfa });
    expect(partial.remainingDebt).toBe(cashDebt - partialAmount);
    expect((await getCashCommissionStatus(partnerAccountId)).cycle).not.toBeNull();

    const fullReference = `BLOCK6-SERVICE-FULL-${Date.now()}`;
    references.push(fullReference);
    await createManualCommissionSettlement({ partnerAccountId, adminId: row.admin_id, amountFcfa: cashDebt - partialAmount, method: "mobile_money", externalReference: fullReference, justification: "Test automatique de clôture complète de dette", paidAt: new Date() });
    expect(await getOutstandingCashCommissionDebt(partnerAccountId)).toBe(0);
    expect(await getCashCommissionStatus(partnerAccountId)).toMatchObject({ cashAllowed: true, cycle: null });
  }, 30_000);
});
