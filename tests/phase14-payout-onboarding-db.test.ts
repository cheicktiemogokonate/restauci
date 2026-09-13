import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import type { PayoutGateway } from "@/modules/transactions/contracts";
import { warmNeonTestPool } from "./support/neon-test-connection";

const enabled = process.env.RUN_PHASE14_PAYOUT_DB_TESTS === "true";
const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL_TEST;
if (enabled && !databaseUrl) {
  throw new Error("TEST_DATABASE_URL est obligatoire pour les invariants payout Phase 14.");
}
const describeDb = enabled ? describe.sequential : describe.skip;

describeDb("Phase 14 — invariants des destinations de versement", () => {
  const pool = new Pool({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 30_000,
    idleTimeoutMillis: 60_000,
    keepAlive: true,
  });
  const runId = crypto.randomUUID();
  const ownerId = crypto.randomUUID();
  const adminId = crypto.randomUUID();
  const partnerAccountId = crypto.randomUUID();
  let transactions: typeof import("@/modules/transactions/server");

  beforeAll(async () => {
    await warmNeonTestPool(pool);
    transactions = await import("@/modules/transactions/server");
    await pool.query(
      `INSERT INTO users (id, email, password, role, nom, telephone, created_at, updated_at)
       VALUES
         ($1, $2, 'x', 'partner', 'Partner payout Phase 14', '+2250700000014', NOW(), NOW()),
         ($3, $4, 'x', 'admin', 'Admin payout Phase 14', '+2250500000014', NOW(), NOW())`,
      [
        ownerId,
        `phase14.payout.${runId}@test.invalid`,
        adminId,
        `phase14.payout.admin.${runId}@test.invalid`,
      ],
    );
    await pool.query(
      `INSERT INTO partner_accounts (id, user_id, activity_type, created_at, updated_at)
       VALUES ($1, $2, 'residence', NOW(), NOW())`,
      [partnerAccountId, ownerId],
    );
  }, 60_000);

  afterAll(async () => {
    await pool.query("DELETE FROM audit_log WHERE partner_account_id = $1", [
      partnerAccountId,
    ]);
    await pool.query(
      `DELETE FROM event_effect_receipts
       WHERE event_id IN (SELECT id FROM business_events WHERE partner_account_id = $1)`,
      [partnerAccountId],
    );
    await pool.query(
      `DELETE FROM outbox_messages
       WHERE event_id IN (SELECT id FROM business_events WHERE partner_account_id = $1)`,
      [partnerAccountId],
    );
    await pool.query("DELETE FROM business_events WHERE partner_account_id = $1", [
      partnerAccountId,
    ]);
    await pool.query(
      "DELETE FROM payment_provider_accounts WHERE partner_account_id = $1",
      [partnerAccountId],
    );
    await pool.query("DELETE FROM partner_accounts WHERE id = $1", [partnerAccountId]);
    await pool.query("DELETE FROM users WHERE id = ANY($1::varchar[])", [
      [ownerId, adminId],
    ]);
    await pool.end();
  }, 60_000);

  it("a appliqué les garde-fous 0046 et 0047", async () => {
    const result = await pool.query<{ conname: string }>(
      `SELECT conname
       FROM pg_constraint
       WHERE conrelid = 'payment_provider_accounts'::regclass
         AND conname = ANY($1::text[])
       ORDER BY conname`,
      [[
        "payment_provider_accounts_active_eligibility",
        "payment_provider_accounts_actor_coherent",
        "payment_provider_accounts_last4_valid",
        "payment_provider_accounts_verification_coherent",
      ]],
    );
    expect(result.rows.map((row) => row.conname)).toEqual([
      "payment_provider_accounts_active_eligibility",
      "payment_provider_accounts_actor_coherent",
      "payment_provider_accounts_last4_valid",
      "payment_provider_accounts_verification_coherent",
    ]);
    const trigger = await pool.query(
      `SELECT 1
       FROM pg_trigger
       WHERE tgrelid = 'payment_provider_accounts'::regclass
         AND tgname = 'payment_provider_accounts_actor_owner_guard'
         AND NOT tgisinternal`,
    );
    expect(trigger.rowCount).toBe(1);
  });

  it("refuse un compte live non vérifié et deux acteurs concurrents", async () => {
    await expect(pool.query(
      `INSERT INTO payment_provider_accounts (
        id, partner_account_id, provider, provider_account_reference, status,
        destination_type, provider_environment, provider_verified,
        settlement_institution_code, settlement_institution_name,
        account_identifier_last4, linked_by_user_id, created_at, updated_at
      ) VALUES (
        $1, $2, 'paystack', $3, 'active', 'mobile_money', 'live', false,
        'WAVE_CI', 'Wave Côte d''Ivoire', '0014', $4, NOW(), NOW()
      )`,
      [crypto.randomUUID(), partnerAccountId, `ACCT_live_${runId}`, ownerId],
    )).rejects.toMatchObject({ code: "23514" });

    await expect(pool.query(
      `INSERT INTO payment_provider_accounts (
        id, partner_account_id, provider, provider_account_reference, status,
        destination_type, provider_environment, provider_verified,
        settlement_institution_code, settlement_institution_name,
        account_identifier_last4, linked_by_admin_id, linked_by_user_id,
        created_at, updated_at
      ) VALUES (
        $1, $2, 'paystack', $3, 'active', 'mobile_money', 'test', false,
        'WAVE_CI', 'Wave Côte d''Ivoire', '0014', $4, $5, NOW(), NOW()
      )`,
      [crypto.randomUUID(), partnerAccountId, `ACCT_actors_${runId}`, adminId, ownerId],
    )).rejects.toMatchObject({ code: "23514" });

    await expect(pool.query(
      `INSERT INTO payment_provider_accounts (
        id, partner_account_id, provider, provider_account_reference, status,
        destination_type, provider_environment, provider_verified,
        settlement_institution_code, account_identifier_last4,
        linked_by_user_id, created_at, updated_at
      ) VALUES (
        $1, $2, 'paystack', $3, 'active', 'mobile_money', 'test', false,
        'WAVE_CI', '0014', $4, NOW(), NOW()
      )`,
      [crypto.randomUUID(), partnerAccountId, `ACCT_owner_${runId}`, adminId],
    )).rejects.toMatchObject({ code: "23514" });

    await expect(pool.query(
      `INSERT INTO payment_provider_accounts (
        id, partner_account_id, provider, provider_account_reference, status,
        destination_type, provider_environment, provider_verified,
        settlement_institution_code, account_identifier_last4,
        linked_by_admin_id, created_at, updated_at
      ) VALUES (
        $1, $2, 'paystack', $3, 'active', 'mobile_money', 'test', false,
        'WAVE_CI', '0014', $4, NOW(), NOW()
      )`,
      [crypto.randomUUID(), partnerAccountId, `ACCT_admin_${runId}`, ownerId],
    )).rejects.toMatchObject({ code: "23514" });
  });

  it("autorise le subaccount TEST non vérifié sans stocker le numéro complet", async () => {
    await pool.query(
      `INSERT INTO payment_provider_accounts (
        id, partner_account_id, provider, provider_account_reference, status,
        destination_type, provider_environment, provider_verified,
        settlement_institution_code, settlement_institution_name,
        account_identifier_last4, linked_by_user_id, created_at, updated_at
      ) VALUES (
        $1, $2, 'paystack', $3, 'active', 'mobile_money', 'test', false,
        'WAVE_CI', 'Wave Côte d''Ivoire', '0014', $4, NOW(), NOW()
      )`,
      [crypto.randomUUID(), partnerAccountId, `ACCT_test_${runId}`, ownerId],
    );
    const result = await pool.query(
      `SELECT destination_type, provider_environment, provider_verified,
        account_identifier_last4, linked_by_admin_id, linked_by_user_id
       FROM payment_provider_accounts
       WHERE partner_account_id = $1`,
      [partnerAccountId],
    );
    expect(result.rows[0]).toMatchObject({
      destination_type: "mobile_money",
      provider_environment: "test",
      provider_verified: false,
      account_identifier_last4: "0014",
      linked_by_admin_id: null,
      linked_by_user_id: ownerId,
    });
    expect(JSON.stringify(result.rows[0])).not.toContain("0700000014");
  });

  it("provisionne par la commande canonique et émet sa causalité", async () => {
    await pool.query(
      "DELETE FROM payment_provider_accounts WHERE partner_account_id = $1",
      [partnerAccountId],
    );
    const gateway: PayoutGateway = {
      listInstitutions: async () => [{
        code: "WAVE_CI",
        name: "Wave Côte d’Ivoire",
        type: "mobile_money",
      }],
      createSubaccount: async (input) => {
        expect(input).toMatchObject({
          businessName: "Partenaire KYC Phase 14",
          institutionCode: "WAVE_CI",
          accountIdentifier: "0700000014",
          percentageCharge: 0,
        });
        return {
          reference: "ACCT_phase14fixture",
          businessName: input.businessName,
          active: true,
          verified: false,
          currency: "XOF",
          environment: "test",
          institutionCode: "WAVE_CI",
          institutionName: "Wave Côte d’Ivoire",
        };
      },
      getSubaccount: async () => {
        throw new Error("Non appelé");
      },
    };

    const destination = await transactions.configurePartnerPayoutDestination({
      partnerAccountId,
      userId: ownerId,
      businessName: "Partenaire KYC Phase 14",
      institutionCode: "WAVE_CI",
      accountIdentifier: "+225 07 00 00 00 14",
    }, gateway);
    expect(destination).toMatchObject({
      status: "active",
      type: "mobile_money",
      environment: "test",
      maskedIdentifier: "•••• 0014",
    });
    expect(JSON.stringify(destination)).not.toContain("0700000014");

    const causal = await pool.query(
      `SELECT event.type, outbox.effect_type
       FROM business_events AS event
       JOIN outbox_messages AS outbox ON outbox.event_id = event.id
       WHERE event.partner_account_id = $1`,
      [partnerAccountId],
    );
    expect(causal.rows).toEqual([{
      type: "finance.payoutdestination.provisioned.v1",
      effect_type: "audit.project",
    }]);
  });
});
