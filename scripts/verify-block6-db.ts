import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL manquante");
const pool = new Pool({ connectionString });
const commissionId = crypto.randomUUID();
const prefix = `BLOCK6-${Date.now()}`;

async function getDebt(partnerAccountId: string) {
  const result = await pool.query<{ debt: string }>(`
    SELECT COALESCE(SUM(c.amount_fcfa - COALESCE((
      SELECT SUM(a.amount_fcfa) FROM commission_settlement_allocations a
      JOIN commission_settlements s ON s.id = a.settlement_id
      WHERE a.commission_id = c.id AND s.statut = 'confirmed'
    ), 0)), 0)::text AS debt
    FROM commissions c
    WHERE c.partner_account_id = $1 AND c.commercial_status = 'due'
      AND c.collection_mode = 'cash_receivable'
  `, [partnerAccountId]);
  return Number(result.rows[0]?.debt ?? 0);
}

async function concurrentSettlement(context: { partner_account_id: string; admin_id: string }, index: number) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT id FROM partner_accounts WHERE id = $1 FOR UPDATE", [context.partner_account_id]);
    const debt = await client.query<{ debt: string }>(`
      SELECT COALESCE(SUM(c.amount_fcfa - COALESCE((
        SELECT SUM(a.amount_fcfa) FROM commission_settlement_allocations a
        JOIN commission_settlements s ON s.id = a.settlement_id
        WHERE a.commission_id = c.id AND s.statut = 'confirmed'
      ), 0)), 0)::text AS debt
      FROM commissions c WHERE c.partner_account_id = $1
        AND c.commercial_status = 'due' AND c.collection_mode = 'cash_receivable'
    `, [context.partner_account_id]);
    if (Number(debt.rows[0]?.debt ?? 0) < 800) throw new Error("SETTLEMENT_EXCEEDS_DEBT");
    const settlementId = crypto.randomUUID();
    await client.query(`INSERT INTO commission_settlements
      (id, partner_account_id, admin_id, source, statut, montant_fcfa, moyen_reglement, reference_externe, justification, paid_at, confirmed_at, created_at, updated_at)
      VALUES ($1, $2, $3, 'manual_admin', 'confirmed', 800, 'mobile_money', $4, 'Vérification automatique de concurrence Bloc 6', NOW(), NOW(), NOW(), NOW())`,
      [settlementId, context.partner_account_id, context.admin_id, `${prefix}-${index}`]);
    await client.query(`INSERT INTO commission_settlement_allocations
      (id, settlement_id, commission_id, amount_fcfa, created_at)
      VALUES ($1, $2, $3, 800, NOW())`, [crypto.randomUUID(), settlementId, commissionId]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  const [context] = (
    await pool.query<{
      order_id: string;
      partner_account_id: string;
      admin_id: string;
    }>(`
      SELECT c.id AS order_id, r.partner_account_id, a.id AS admin_id
      FROM commandes c
      JOIN restaurants r ON r.id = c.restaurant_id
      CROSS JOIN LATERAL (SELECT id FROM users WHERE role = 'admin' LIMIT 1) a
      LEFT JOIN commissions co ON co.commande_id = c.id
      WHERE co.id IS NULL
      LIMIT 1
    `)
  ).rows;
  if (!context) throw new Error("Jeu de données insuffisant pour le test Bloc 6");

  try {
    await pool.query(
      `INSERT INTO commissions
        (id, commande_id, partner_account_id, base_amount_fcfa, rate_bps_snapshot, amount_fcfa, commercial_status, collection_mode, due_at, created_at, updated_at)
       VALUES ($1, $2, $3, 10000, 1000, 1000, 'due', 'cash_receivable', NOW(), NOW(), NOW())`,
      [commissionId, context.order_id, context.partner_account_id],
    );

    const initialDebt = await getDebt(context.partner_account_id);
    if (initialDebt !== 1_000) throw new Error(`Dette initiale inattendue: ${initialDebt}`);

    const attempts = await Promise.allSettled(
      [1, 2].map((index) =>
        concurrentSettlement(context, index),
      ),
    );
    const successes = attempts.filter((result) => result.status === "fulfilled");
    const rejected = attempts.filter((result) => result.status === "rejected");
    if (successes.length !== 1 || rejected.length !== 1) {
      throw new Error("Le verrou de concurrence n’a pas produit exactement un succès");
    }
    const rejection = rejected[0];
    if (
      rejection.status !== "rejected" ||
      !(rejection.reason instanceof Error) ||
      rejection.reason.message !== "SETTLEMENT_EXCEEDS_DEBT"
    ) {
      throw new Error("Le second règlement concurrent n’a pas été refusé pour dépassement");
    }
    const remainingDebt = await getDebt(context.partner_account_id);
    if (remainingDebt !== 200) throw new Error(`Solde FIFO inattendu: ${remainingDebt}`);

    const [policy, activeCycles, commissionCount] = await Promise.all([
      pool.query("SELECT * FROM commission_policy_settings WHERE id = 1"),
      pool.query("SELECT COUNT(*)::int AS count FROM commission_debt_cycles WHERE closed_at IS NULL"),
      pool.query("SELECT COUNT(*)::int AS count FROM commissions WHERE commande_id = $1", [context.order_id]),
    ]);
    console.log(JSON.stringify({
      policy: policy.rows[0],
      uniqueCommissionPerOrder: commissionCount.rows[0]?.count === 1,
      concurrency: { successes: successes.length, rejected: rejected.length },
      remainingDebt,
      activeCyclesInDatabase: activeCycles.rows[0]?.count,
    }));
  } finally {
    await pool.query(
      "DELETE FROM commission_settlement_allocations WHERE settlement_id IN (SELECT id FROM commission_settlements WHERE reference_externe LIKE $1)",
      [`${prefix}%`],
    );
    await pool.query("DELETE FROM commission_settlements WHERE reference_externe LIKE $1", [`${prefix}%`]);
    await pool.query("DELETE FROM commissions WHERE id = $1", [commissionId]);
    await pool.query(
      "DELETE FROM audit_log WHERE action = 'commissions_encaissees' AND details->>'externalReference' LIKE $1",
      [`${prefix}%`],
    );
    await pool.end();
  }
}

await main();
