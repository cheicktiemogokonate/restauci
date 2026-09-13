import { migrationPool } from "../../drizzle/db-pool";
import { processCausalityOutbox } from "@/modules/events/server";
import {
  configurePartnerPayoutDestination,
  listPaystackPayoutInstitutions,
} from "@/modules/transactions/server";
import { assertTestDataEnvironment } from "../test-data/data-environment";

const PILOT_ID = "phase14-controlled-test-2026-09-13";
const RESTAURANT_OWNER_EMAIL = "phase14-paystack-restaurant@toutci.app";
const RESTAURANT_SLUG = "restaurant-e2e-restauci";
const RESIDENCE_OWNER_EMAIL = "e2e.residence-owner@toutci.test";
const RESIDENCE_SLUG = "residence-paystack-phase-14";
const RESIDENCE_TITLE = "Résidence Paystack Phase 14";
const ADMIN_EMAIL = "e2e.admin@toutci.test";
const CLIENT_PHONE = "+2250700009999";
const DRIVER_LOGIN = "LIV-E2E000000000001";
const PAYOUT_IDENTIFIER = "0700000000";

type PilotActor = {
  user_id: string;
  partner_account_id: string;
  business_name: string;
};

type PilotActors = {
  adminId: string;
  restaurant: PilotActor;
  residence: PilotActor;
};

type ReadinessRow = Record<string, number | string>;

const expectedCounts = {
  migrations_applied: 49,
  admin_ready: 1,
  client_ready: 1,
  restaurant_partner_ready: 1,
  restaurant_kyc_ready: 1,
  restaurant_ready: 1,
  driver_ready: 1,
  residence_partner_ready: 1,
  residence_kyc_ready: 1,
  residence_ready: 1,
  restaurant_payout_ready: 1,
  residence_payout_ready: 1,
  active_live_unverified: 0,
  payout_actor_mismatches: 0,
  open_outbox: 0,
  dead_letters: 0,
} as const;

function numericReadiness(row: ReadinessRow) {
  return Object.fromEntries(
    Object.keys(expectedCounts).map((key) => [key, Number(row[key] ?? -1)]),
  ) as Record<keyof typeof expectedCounts, number>;
}

async function readActors(): Promise<PilotActors> {
  const client = await migrationPool.connect();
  try {
    const admin = await client.query<{ id: string }>(
      `SELECT id
       FROM users
       WHERE email = $1 AND role = 'admin' AND NOT suspendu`,
      [ADMIN_EMAIL],
    );
    const partners = await client.query<PilotActor & { cohort: string }>(
      `SELECT
         CASE WHEN u.email = $1 THEN 'restaurant' ELSE 'residence' END AS cohort,
         u.id AS user_id,
         pa.id AS partner_account_id,
         CASE WHEN u.email = $1 THEN r.nom ELSE $3 END AS business_name
       FROM users u
       JOIN partner_accounts pa ON pa.user_id = u.id
       LEFT JOIN restaurants r ON r.partner_account_id = pa.id
       WHERE u.email IN ($1, $2)
       ORDER BY cohort`,
      [RESTAURANT_OWNER_EMAIL, RESIDENCE_OWNER_EMAIL, RESIDENCE_TITLE],
    );
    const restaurant = partners.rows.find((row) => row.cohort === "restaurant");
    const residence = partners.rows.find((row) => row.cohort === "residence");
    if (admin.rowCount !== 1 || !restaurant || !residence) {
      throw new Error("La cohorte pilote de base est incomplète.");
    }
    return {
      adminId: admin.rows[0]!.id,
      restaurant,
      residence,
    };
  } finally {
    client.release();
  }
}

async function preparePilotResidence(actors: PilotActors) {
  const client = await migrationPool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `DELETE FROM payment_provider_accounts
       WHERE partner_account_id = $1
         AND provider = 'paystack'
         AND provider_account_reference = 'ACCT_E2ERESIDENCE'`,
      [actors.residence.partner_account_id],
    );
    const residence = await client.query<{ id: string }>(
      `INSERT INTO residences (
         id, partner_account_id, title, slug, description,
         price_per_night_fcfa, max_guests, address, city, country,
         latitude, longitude, publication_intent, publication_enabled_at,
         first_published_at, actif, validated_by_admin_id, validated_at,
         suspendu, created_at, updated_at
       ) VALUES (
         gen_random_uuid(), $1, $2, $3,
         'Logement de recette réservé au pilote contrôlé Paystack TEST.',
         45000, 4, 'Quartier Commerce, Bouaké', 'Bouaké', 'Côte d’Ivoire',
         7.6817075, -5.0166143, true, NOW(), NOW(), true, $4, NOW(),
         false, NOW(), NOW()
       )
       ON CONFLICT (slug) DO UPDATE SET
         title = EXCLUDED.title,
         description = EXCLUDED.description,
         price_per_night_fcfa = EXCLUDED.price_per_night_fcfa,
         max_guests = EXCLUDED.max_guests,
         address = EXCLUDED.address,
         city = EXCLUDED.city,
         country = EXCLUDED.country,
         latitude = EXCLUDED.latitude,
         longitude = EXCLUDED.longitude,
         publication_intent = true,
         publication_enabled_at = COALESCE(residences.publication_enabled_at, NOW()),
         first_published_at = COALESCE(residences.first_published_at, NOW()),
         actif = true,
         validated_by_admin_id = EXCLUDED.validated_by_admin_id,
         validated_at = COALESCE(residences.validated_at, NOW()),
         suspendu = false,
         motif_rejet = null,
         motif_suspension = null,
         archived_at = null,
         updated_at = NOW()
       WHERE residences.partner_account_id = EXCLUDED.partner_account_id
       RETURNING id`,
      [
        actors.residence.partner_account_id,
        RESIDENCE_TITLE,
        RESIDENCE_SLUG,
        actors.adminId,
      ],
    );
    if (residence.rowCount !== 1) {
      throw new Error("Le slug de la Résidence pilote appartient à un autre compte.");
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function provisionPilotPayouts(actors: PilotActors) {
  if (!process.env.PAYSTACK_SECRET_KEY?.startsWith("sk_test_")) {
    throw new Error("Le pilote contrôlé exige explicitement une clé Paystack TEST.");
  }
  const institutions = await listPaystackPayoutInstitutions();
  const wave = institutions.find(
    (institution) =>
      institution.type === "mobile_money" && /wave/i.test(institution.name),
  );
  if (!wave) {
    throw new Error("Wave XOF n'est pas disponible dans le catalogue Paystack TEST.");
  }
  for (const actor of [actors.restaurant, actors.residence]) {
    await configurePartnerPayoutDestination({
      partnerAccountId: actor.partner_account_id,
      userId: actor.user_id,
      businessName: actor.business_name,
      institutionCode: wave.code,
      accountIdentifier: PAYOUT_IDENTIFIER,
    });
  }
}

async function drainCausalityOutbox() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const client = await migrationPool.connect();
    try {
      const result = await client.query<{ count: number }>(
        `SELECT COUNT(*)::int AS count
         FROM outbox_messages
         WHERE status IN ('pending', 'processing', 'retry')`,
      );
      if (Number(result.rows[0]?.count ?? 0) === 0) return;
    } finally {
      client.release();
    }
    await processCausalityOutbox({ limit: 25 });
  }
}

async function checkReadiness() {
  const client = await migrationPool.connect();
  try {
    await client.query("BEGIN READ ONLY");
    const result = await client.query<ReadinessRow>(`
      SELECT
        (SELECT COUNT(*)::int FROM drizzle.__drizzle_migrations) AS migrations_applied,
        (SELECT COUNT(*)::int FROM users WHERE email = '${ADMIN_EMAIL}' AND role = 'admin' AND NOT suspendu) AS admin_ready,
        (SELECT COUNT(*)::int FROM clients WHERE telephone = '${CLIENT_PHONE}' AND actif) AS client_ready,
        (SELECT COUNT(*)::int FROM users u JOIN partner_accounts pa ON pa.user_id = u.id WHERE u.email = '${RESTAURANT_OWNER_EMAIL}' AND u.role = 'partner' AND NOT u.suspendu AND pa.activity_type = 'restaurant') AS restaurant_partner_ready,
        (SELECT COUNT(*)::int FROM users u JOIN partner_accounts pa ON pa.user_id = u.id JOIN partner_identity_verifications piv ON piv.partner_account_id = pa.id WHERE u.email = '${RESTAURANT_OWNER_EMAIL}' AND piv.status = 'verified') AS restaurant_kyc_ready,
        (SELECT COUNT(*)::int FROM restaurants WHERE slug = '${RESTAURANT_SLUG}' AND actif AND en_ligne AND accepte_commandes AND NOT suspendu AND service_market_id IS NOT NULL AND service_market_version_id IS NOT NULL) AS restaurant_ready,
        (SELECT COUNT(*)::int FROM livreurs l JOIN restaurants r ON r.id = l.restaurant_id WHERE l.login_id = '${DRIVER_LOGIN}' AND l.actif AND l.en_ligne AND r.slug = '${RESTAURANT_SLUG}') AS driver_ready,
        (SELECT COUNT(*)::int FROM users u JOIN partner_accounts pa ON pa.user_id = u.id WHERE u.email = '${RESIDENCE_OWNER_EMAIL}' AND u.role = 'partner' AND NOT u.suspendu AND pa.activity_type = 'residence') AS residence_partner_ready,
        (SELECT COUNT(*)::int FROM users u JOIN partner_accounts pa ON pa.user_id = u.id JOIN partner_identity_verifications piv ON piv.partner_account_id = pa.id WHERE u.email = '${RESIDENCE_OWNER_EMAIL}' AND piv.status = 'verified') AS residence_kyc_ready,
        (SELECT COUNT(*)::int FROM residences WHERE slug = '${RESIDENCE_SLUG}' AND actif AND publication_intent AND publication_enabled_at IS NOT NULL AND NOT suspendu AND archived_at IS NULL) AS residence_ready,
        (SELECT COUNT(*)::int FROM users u JOIN partner_accounts pa ON pa.user_id = u.id JOIN payment_provider_accounts ppa ON ppa.partner_account_id = pa.id WHERE u.email = '${RESTAURANT_OWNER_EMAIL}' AND ppa.provider = 'paystack' AND ppa.status = 'active' AND ppa.provider_environment = 'test' AND ppa.destination_type = 'mobile_money' AND ppa.account_identifier_last4 = '0000' AND ppa.linked_by_user_id = u.id) AS restaurant_payout_ready,
        (SELECT COUNT(*)::int FROM users u JOIN partner_accounts pa ON pa.user_id = u.id JOIN payment_provider_accounts ppa ON ppa.partner_account_id = pa.id WHERE u.email = '${RESIDENCE_OWNER_EMAIL}' AND ppa.provider = 'paystack' AND ppa.status = 'active' AND ppa.provider_environment = 'test' AND ppa.destination_type = 'mobile_money' AND ppa.account_identifier_last4 = '0000' AND ppa.linked_by_user_id = u.id) AS residence_payout_ready,
        (SELECT COUNT(*)::int FROM payment_provider_accounts WHERE status = 'active' AND provider_environment = 'live' AND NOT provider_verified) AS active_live_unverified,
        (SELECT COUNT(*)::int FROM payment_provider_accounts ppa JOIN partner_accounts pa ON pa.id = ppa.partner_account_id LEFT JOIN users admin ON admin.id = ppa.linked_by_admin_id WHERE (ppa.linked_by_user_id IS NOT NULL AND ppa.linked_by_user_id <> pa.user_id) OR (ppa.linked_by_admin_id IS NOT NULL AND admin.role <> 'admin')) AS payout_actor_mismatches,
        (SELECT COUNT(*)::int FROM outbox_messages WHERE status <> 'completed') AS open_outbox,
        (SELECT COUNT(*)::int FROM outbox_messages WHERE status = 'dead_letter') AS dead_letters
    `);
    await client.query("COMMIT");
    const checks = numericReadiness(result.rows[0] ?? {});
    const failures = Object.entries(expectedCounts).filter(
      ([key, expected]) => checks[key as keyof typeof checks] !== expected,
    );
    return { checks, failures };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  const target = assertTestDataEnvironment({ argv: process.argv, env: process.env });
  const openRequested = process.argv.includes("--open");
  if (openRequested) {
    const actors = await readActors();
    await preparePilotResidence(actors);
    await provisionPilotPayouts(actors);
    await drainCausalityOutbox();
  }
  const readiness = await checkReadiness();
  const status = readiness.failures.length === 0
    ? openRequested ? "open" : "ready"
    : "blocked";
  console.log(JSON.stringify({
    pilotId: PILOT_ID,
    generatedAt: new Date().toISOString(),
    environment: target.environment,
    mode: openRequested ? "open" : "read-only",
    status,
    cohort: {
      admin: "Administrateur E2E",
      restaurantPartner: "Restaurateur E2E",
      residencePartner: "Propriétaire Résidence E2E",
      client: "Client E2E",
      driver: "Livreur E2E",
    },
    datasets: {
      restaurant: RESTAURANT_SLUG,
      residence: RESIDENCE_SLUG,
      payout: "Wave TEST •••• 0000",
    },
    checks: readiness.checks,
    failures: readiness.failures.map(([check, expected]) => ({
      check,
      expected,
      actual: readiness.checks[check as keyof typeof readiness.checks],
    })),
  }, null, 2));
  if (readiness.failures.length > 0) process.exitCode = 2;
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(() => migrationPool.end());
