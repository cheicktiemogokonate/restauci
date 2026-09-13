import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import {
  warmApplicationDatabaseConnections,
  warmNeonTestPool,
} from "./support/neon-test-connection";

const enabled = process.env.RUN_PHASE8_DB_TESTS === "true";
const allowDevelopment =
  process.env.ALLOW_DEVELOPMENT_PHASE8_DB_TESTS === "true";
const databaseUrl = process.env.DATABASE_URL;
if (enabled && (!databaseUrl || !allowDevelopment)) {
  throw new Error(
    "Les tests DB Phase 8 exigent DATABASE_URL et ALLOW_DEVELOPMENT_PHASE8_DB_TESTS=true",
  );
}
const describeDb = enabled ? describe : describe.skip;

describeDb("phase 8 Residence ownership and calendar", () => {
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 2,
    connectionTimeoutMillis: 30_000,
    idleTimeoutMillis: 60_000,
    keepAlive: true,
  });
  const suffix = crypto.randomUUID();
  const userIds = [crypto.randomUUID(), crypto.randomUUID()];
  const partnerAccountIds = [crypto.randomUUID(), crypto.randomUUID()];
  const residenceIds = [crypto.randomUUID(), crypto.randomUUID()];
  const clientId = crypto.randomUUID();
  const createdReservationIds: string[] = [];

  async function insertReservation(input: {
    residenceId: string;
    partnerAccountId: string;
    checkIn: string;
    checkOut: string;
    status?: "en_attente_paiement" | "confirmee" | "annulee";
  }) {
    const id = crypto.randomUUID();
    createdReservationIds.push(id);
    const status = input.status ?? "en_attente_paiement";
    await pool.query(
      `INSERT INTO residence_reservations (
         id, residence_id, partner_account_id, client_id, status,
         check_in, check_out, nights, guests, price_per_night_snapshot_fcfa,
         subtotal_fcfa, total_fcfa, confirmed_at, cancelled_at, created_at, updated_at
       ) VALUES (
         $1, $2, $3, $4, $5::residence_reservation_status,
         $6, $7, ($7::date - $6::date), 2, 25000,
         25000 * ($7::date - $6::date), 25000 * ($7::date - $6::date),
         CASE WHEN $5::text = 'confirmee' THEN NOW() ELSE NULL END,
         CASE WHEN $5::text = 'annulee' THEN NOW() ELSE NULL END, NOW(), NOW()
       )`,
      [
        id,
        input.residenceId,
        input.partnerAccountId,
        clientId,
        status,
        input.checkIn,
        input.checkOut,
      ],
    );
    return id;
  }

  beforeAll(async () => {
    await warmNeonTestPool(pool);
    await warmApplicationDatabaseConnections();
    await pool.query(
      `INSERT INTO users (id, nom, email, password, telephone, role, created_at, updated_at)
       VALUES
       ($1, 'Résidence Phase 8 A', $2, 'x', $3, 'partner', NOW(), NOW()),
       ($4, 'Résidence Phase 8 B', $5, 'x', $6, 'partner', NOW(), NOW())`,
      [
        userIds[0],
        `residence-a-phase8-${suffix}@example.test`,
        `+22573${suffix.replaceAll("-", "").slice(0, 8)}`,
        userIds[1],
        `residence-b-phase8-${suffix}@example.test`,
        `+22574${suffix.replaceAll("-", "").slice(0, 8)}`,
      ],
    );
    await pool.query(
      `INSERT INTO partner_accounts (id, user_id, activity_type, created_at, updated_at)
       VALUES ($1, $2, 'residence', NOW(), NOW()), ($3, $4, 'residence', NOW(), NOW())`,
      [partnerAccountIds[0], userIds[0], partnerAccountIds[1], userIds[1]],
    );
    await pool.query(
      `INSERT INTO residences (
         id, partner_account_id, title, slug, description,
         price_per_night_fcfa, max_guests, address, city, country,
         created_at, updated_at
       ) VALUES
       ($1, $2, 'Résidence Phase 8 A', $3, 'Logement de test Phase 8 A.', 25000, 4, 'Adresse A', 'Abidjan', 'Côte d’Ivoire', NOW(), NOW()),
       ($4, $5, 'Résidence Phase 8 B', $6, 'Logement de test Phase 8 B.', 25000, 4, 'Adresse B', 'Bouaké', 'Côte d’Ivoire', NOW(), NOW())`,
      [
        residenceIds[0],
        partnerAccountIds[0],
        `residence-a-phase8-${suffix}`,
        residenceIds[1],
        partnerAccountIds[1],
        `residence-b-phase8-${suffix}`,
      ],
    );
    await pool.query(
      `INSERT INTO clients (id, nom, telephone, email, created_at, updated_at)
       VALUES ($1, 'Client Phase 8', $2, $3, NOW(), NOW())`,
      [
        clientId,
        `+22575${suffix.replaceAll("-", "").slice(0, 8)}`,
        `client-phase8-${suffix}@example.test`,
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
        "DELETE FROM notifications WHERE client_id = $1 OR user_id = ANY($2::varchar[])",
        [clientId, userIds],
      );
      await client.query(
        "DELETE FROM financial_journal_entries WHERE partner_account_id = ANY($1::uuid[])",
        [partnerAccountIds],
      );
      await client.query(
        "DELETE FROM outbox_messages WHERE event_id IN (SELECT id FROM business_events WHERE partner_account_id = ANY($1::uuid[]))",
        [partnerAccountIds],
      );
      await client.query(
        "DELETE FROM audit_log WHERE partner_account_id = ANY($1::uuid[])",
        [partnerAccountIds],
      );
      await client.query(
        "DELETE FROM business_events WHERE partner_account_id = ANY($1::uuid[])",
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
        "DELETE FROM residence_reservations WHERE id = ANY($1::uuid[])",
        [createdReservationIds],
      );
      await client.query(
        "DELETE FROM residences WHERE id = ANY($1::uuid[])",
        [residenceIds],
      );
      await client.query("DELETE FROM clients WHERE id = $1", [clientId]);
      await client.query(
        "DELETE FROM partner_accounts WHERE id = ANY($1::uuid[])",
        [partnerAccountIds],
      );
      await client.query(
        "DELETE FROM users WHERE id = ANY($1::varchar[])",
        [userIds],
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

  it("rejects a reservation attributed to another Residence account", async () => {
    await expect(
      insertReservation({
        residenceId: residenceIds[0]!,
        partnerAccountId: partnerAccountIds[1]!,
        checkIn: "2031-04-01",
        checkOut: "2031-04-03",
      }),
    ).rejects.toMatchObject({
      code: "23503",
      constraint: "residence_reservations_residence_partner_fk",
    });
  });

  it("rejects overlapping active stays but accepts adjacent and cancelled ranges", async () => {
    await insertReservation({
      residenceId: residenceIds[0]!,
      partnerAccountId: partnerAccountIds[0]!,
      checkIn: "2031-05-10",
      checkOut: "2031-05-14",
    });
    await expect(
      insertReservation({
        residenceId: residenceIds[0]!,
        partnerAccountId: partnerAccountIds[0]!,
        checkIn: "2031-05-12",
        checkOut: "2031-05-16",
      }),
    ).rejects.toMatchObject({
      code: "23P01",
      constraint: "residence_reservations_no_active_overlap",
    });
    await expect(
      insertReservation({
        residenceId: residenceIds[0]!,
        partnerAccountId: partnerAccountIds[0]!,
        checkIn: "2031-05-14",
        checkOut: "2031-05-16",
      }),
    ).resolves.toBeTruthy();
    await expect(
      insertReservation({
        residenceId: residenceIds[0]!,
        partnerAccountId: partnerAccountIds[0]!,
        checkIn: "2031-05-11",
        checkOut: "2031-05-13",
        status: "annulee",
      }),
    ).resolves.toBeTruthy();
  });

  it("cancels a paid stay and creates one full refund obligation atomically", async () => {
    const reservationId = await insertReservation({
      residenceId: residenceIds[1]!,
      partnerAccountId: partnerAccountIds[1]!,
      checkIn: "2031-06-10",
      checkOut: "2031-06-12",
      status: "confirmee",
    });
    const transactionId = crypto.randomUUID();
    const paymentId = crypto.randomUUID();
    await pool.query(
      `INSERT INTO transactions (
         id, type, status, partner_account_id, client_id, amount_fcfa,
         residence_reservation_id, paid_at, created_at, updated_at
       ) VALUES (
         $1, 'reservation_residence', 'paid', $2, $3, 50000,
         $4, NOW(), NOW(), NOW()
       )`,
      [transactionId, partnerAccountIds[1], clientId, reservationId],
    );
    await pool.query(
      `INSERT INTO payments (
         id, transaction_id, provider, method, status, amount_fcfa,
         provider_reference, confirmed_at, created_at, updated_at
       ) VALUES (
         $1, $2, 'paystack', 'card', 'confirmed', 50000,
         $3, NOW(), NOW(), NOW()
       )`,
      [paymentId, transactionId, `phase8-${suffix}`],
    );

    const { cancelClientResidenceReservation } = await import(
      "@/modules/residences/server"
    );
    const result = await cancelClientResidenceReservation(clientId, reservationId);
    expect(result.refundObligationId).toBeTruthy();

    const state = await pool.query(
      `SELECT
         rr.status::text AS reservation_status,
         refund.type::text AS refund_type,
         refund.status::text AS refund_status,
         refund.amount_fcfa,
         refund.refund_idempotency_key,
         COUNT(DISTINCT fje.id)::int AS journal_count,
         COUNT(DISTINCT be.id)::int AS event_count
       FROM residence_reservations rr
       JOIN transactions refund ON refund.original_payment_id = $2
       LEFT JOIN financial_journal_entries fje ON fje.transaction_id = refund.id
       LEFT JOIN business_events be
         ON be.partner_account_id = rr.partner_account_id
         AND be.target_id = rr.id::text
         AND be.type = 'residence.reservation.cancelled.v1'
       WHERE rr.id = $1
       GROUP BY rr.status, refund.type, refund.status, refund.amount_fcfa,
         refund.refund_idempotency_key`,
      [reservationId, paymentId],
    );
    expect(state.rows[0]).toMatchObject({
      reservation_status: "annulee",
      refund_type: "remboursement",
      refund_status: "pending",
      amount_fcfa: 50_000,
      refund_idempotency_key: `residence-cancellation:${reservationId}`,
      journal_count: 1,
      event_count: 1,
    });
  }, 60_000);
});
