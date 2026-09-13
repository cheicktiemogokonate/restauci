import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import {
  warmApplicationDatabaseConnections,
  warmNeonTestPool,
} from "./support/neon-test-connection";

const enabled = process.env.RUN_A15_DB_TESTS === "true";
const databaseUrl =
  process.env.TEST_DATABASE_URL ??
  process.env.DATABASE_URL_TEST ??
  (process.env.ALLOW_DEVELOPMENT_DB_TESTS === "true"
    ? process.env.DATABASE_URL
    : undefined);
if (enabled && !databaseUrl) throw new Error("TEST_DATABASE_URL est obligatoire");
const describeDatabase = enabled ? describe : describe.skip;

describeDatabase("A1.5 database invariants", () => {
  const pool = new Pool({
    connectionString: databaseUrl!,
    max: 2,
    connectionTimeoutMillis: 30_000,
    idleTimeoutMillis: 60_000,
    keepAlive: true,
  });
  const suffix = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const partnerAccountId = crypto.randomUUID();
  const restaurantId = crypto.randomUUID();
  const clientId = crypto.randomUUID();
  const periodId = crypto.randomUUID();
  const scheduleId = crypto.randomUUID();
  const categoryId = crypto.randomUUID();
  const dishId = crypto.randomUUID();
  const orderIds: string[] = [];

  beforeAll(async () => {
    await warmNeonTestPool(pool);
    await warmApplicationDatabaseConnections();
    await pool.query(
      `INSERT INTO users (id, email, password, nom, telephone, role, created_at, updated_at)
       VALUES ($1, $2, 'test-only', 'A15 Partner', '+2250000000015', 'partner', NOW(), NOW())`,
      [userId, `a15-${suffix}@example.test`],
    );
    await pool.query(
      `INSERT INTO partner_accounts (id, user_id, activity_type, created_at, updated_at)
       VALUES ($1, $2, 'restaurant', NOW(), NOW())`,
      [partnerAccountId, userId],
    );
    await pool.query(
      `INSERT INTO restaurants (
         id, partner_account_id, nom, slug, telephone, adresse, latitude, longitude,
         actif, en_ligne, accepte_commandes, suspendu, created_at, updated_at
       ) VALUES ($1, $2, 'A15 Restaurant', $3, '+2250000000015', 'Abidjan', 5.3, -4,
         true, true, true, false, NOW(), NOW())`,
      [restaurantId, partnerAccountId, `a15-${suffix}`],
    );
    await pool.query(
      `INSERT INTO clients (id, nom, telephone, actif, created_at, updated_at)
       VALUES ($1, 'A15 Client', $2, true, NOW(), NOW())`,
      [clientId, `+225${suffix.replaceAll("-", "").slice(0, 10)}`],
    );
    await pool.query(
      `INSERT INTO subscription_periods (
         id, partner_account_id, plan_code, taux_commission_bps_fige,
         prix_paye_fcfa, date_debut, date_echeance, statut, created_at
       ) VALUES ($1, $2, 'croissance', 777, 25000, NOW() - INTERVAL '1 hour',
         NOW() + INTERVAL '1 hour', 'active', NOW())`,
      [periodId, partnerAccountId],
    );
    await pool.query(
      `INSERT INTO subscription_period_limits (
         id, subscription_period_id, activity_type, resource_type, max_count, created_at
       ) VALUES
         ($1, $3, 'restaurant', 'category', NULL, NOW()),
         ($2, $3, 'restaurant', 'dish', NULL, NOW())`,
      [crypto.randomUUID(), crypto.randomUUID(), periodId],
    );
    await pool.query(
      `INSERT INTO creneaux_horaires (
         id, restaurant_id, nom, heure_ouverture, heure_fermeture,
         jours_actifs, actif, created_at, updated_at
       ) VALUES ($1, $2, 'Déjeuner', '12:00', '15:00', ARRAY['jeu'], true, NOW(), NOW())`,
      [scheduleId, restaurantId],
    );
    await pool.query(
      `INSERT INTO categories (
         id, restaurant_id, creneau_id, nom, ordre, publication_intent,
         first_published_at, created_at, updated_at
       ) VALUES ($1, $2, $3, 'Déjeuner', 0, true, NOW(), NOW(), NOW())`,
      [categoryId, restaurantId, scheduleId],
    );
    await pool.query(
      `INSERT INTO plats (
         id, restaurant_id, categorie_id, nom, prix, disponible, ordre,
         publication_intent, first_published_at, created_at, updated_at
       ) VALUES ($1, $2, $3, 'Plat A15', 10000, true, 0, true, NOW(), NOW(), NOW())`,
      [dishId, restaurantId, categoryId],
    );
  }, 60_000);

  afterAll(async () => {
    await pool.query("DELETE FROM commissions WHERE commande_id = ANY($1)", [orderIds]);
    await pool.query("DELETE FROM commandes WHERE id = ANY($1)", [orderIds]);
    await pool.query("DELETE FROM plats WHERE id = $1", [dishId]);
    await pool.query("DELETE FROM categories WHERE id = $1", [categoryId]);
    await pool.query("DELETE FROM creneaux_horaires WHERE id = $1", [scheduleId]);
    await pool.query("DELETE FROM subscription_period_limits WHERE subscription_period_id = $1", [periodId]);
    await pool.query("DELETE FROM subscription_periods WHERE partner_account_id = $1", [partnerAccountId]);
    await pool.query("DELETE FROM restaurants WHERE id = $1", [restaurantId]);
    await pool.query("DELETE FROM partner_accounts WHERE id = $1", [partnerAccountId]);
    await pool.query("DELETE FROM clients WHERE id = $1", [clientId]);
    await pool.query("DELETE FROM users WHERE id = $1", [userId]);
    await pool.end();
  }, 60_000);

  async function createPendingOrder(status: "recue" | "prete") {
    const orderId = crypto.randomUUID();
    orderIds.push(orderId);
    await pool.query(
      `INSERT INTO commandes (
         id, numero, restaurant_id, client_id, mode_commande, statut,
         nom_client, telephone_client, items, sous_total, frais_livraison,
         remise, total, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, 'sur_place', $5, 'A15 Client', '+2250000000015',
         '[]'::jsonb, 10000, 0, 0, 10000, NOW(), NOW())`,
      [orderId, `A15-${orderIds.length}-${suffix.slice(0, 6)}`, restaurantId, clientId, status],
    );
    await pool.query(
      `INSERT INTO commissions (
         id, commande_id, partner_account_id, base_amount_fcfa,
         rate_bps_snapshot, amount_fcfa, commercial_status, collection_mode,
         created_at, updated_at
       ) VALUES ($1, $2, $3, 10000, 777, 777, 'pending', 'cash_receivable', NOW(), NOW())`,
      [crypto.randomUUID(), orderId, partnerAccountId],
    );
    return orderId;
  }

  async function createOrderWithoutCommission(status: "recue" | "prete") {
    const orderId = crypto.randomUUID();
    orderIds.push(orderId);
    await pool.query(
      `INSERT INTO commandes (
         id, numero, restaurant_id, client_id, mode_commande, statut,
         nom_client, telephone_client, items, sous_total, frais_livraison,
         remise, total, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, 'sur_place', $5, 'A15 Client', '+2250000000015',
         '[]'::jsonb, 10000, 0, 0, 10000, NOW(), NOW())`,
      [orderId, `A15-${orderIds.length}-${suffix.slice(0, 6)}`, restaurantId, clientId, status],
    );
    return orderId;
  }

  async function state(orderId: string) {
    const result = await pool.query<{ statut: string; commercial_status: string }>(
      `SELECT c.statut, co.commercial_status
       FROM commandes c JOIN commissions co ON co.commande_id = c.id
       WHERE c.id = $1`,
      [orderId],
    );
    return result.rows[0];
  }

  it("cancels an order and voids its commission atomically and idempotently", async () => {
    const { transactionalDb } = await import("@/infrastructure/db/transaction");
    const { applyLegacyRestaurantOrderTransition } = await import("@/modules/orders/server");
    const orderId = await createPendingOrder("recue");

    const first = await transactionalDb.transaction((tx) =>
      applyLegacyRestaurantOrderTransition(tx, {
        id: orderId,
        clientId,
        targetStatus: "annulee",
        allowedPreviousStatuses: ["recue"],
      }),
    );
    const replay = await transactionalDb.transaction((tx) =>
      applyLegacyRestaurantOrderTransition(tx, {
        id: orderId,
        clientId,
        targetStatus: "annulee",
        allowedPreviousStatuses: ["recue"],
      }),
    );

    expect(first?.commande.statut).toBe("annulee");
    expect(replay).toBeUndefined();
    expect(await state(orderId)).toEqual({ statut: "annulee", commercial_status: "void" });
  });

  it("serves once, rejects an impossible replay, and leaves commission due", async () => {
    const { transactionalDb } = await import("@/infrastructure/db/transaction");
    const { applyLegacyRestaurantOrderTransition } = await import("@/modules/orders/server");
    const orderId = await createPendingOrder("prete");
    await transactionalDb.transaction((tx) =>
      applyLegacyRestaurantOrderTransition(tx, { id: orderId, restaurantId, targetStatus: "servie" }),
    );
    const impossible = await transactionalDb.transaction((tx) =>
      applyLegacyRestaurantOrderTransition(tx, { id: orderId, restaurantId, targetStatus: "annulee" }),
    );
    expect(impossible).toBeUndefined();
    expect(await state(orderId)).toEqual({ statut: "servie", commercial_status: "due" });
  });

  it.each([
    ["annulee", "recue", "void"],
    ["servie", "prete", "due"],
  ] as const)(
    "serializes two simultaneous transitions to %s",
    async (targetStatus, initialStatus, commissionStatus) => {
      const { transactionalDb } = await import("@/infrastructure/db/transaction");
      const { applyLegacyRestaurantOrderTransition } = await import("@/modules/orders/server");
      const orderId = await createPendingOrder(initialStatus);
      const results = await Promise.all([
        transactionalDb.transaction((tx) =>
          applyLegacyRestaurantOrderTransition(tx, { id: orderId, restaurantId, targetStatus }),
        ),
        transactionalDb.transaction((tx) =>
          applyLegacyRestaurantOrderTransition(tx, { id: orderId, restaurantId, targetStatus }),
        ),
      ]);
      expect(results.filter(Boolean)).toHaveLength(1);
      expect(await state(orderId)).toEqual({
        statut: targetStatus,
        commercial_status: commissionStatus,
      });
    },
  );

  it("rolls the order status back if the financial transition cannot complete", async () => {
    const { transactionalDb } = await import("@/infrastructure/db/transaction");
    const { applyLegacyRestaurantOrderTransition } = await import("@/modules/orders/server");
    const orderId = await createOrderWithoutCommission("recue");
    await expect(
      transactionalDb.transaction((tx) =>
        applyLegacyRestaurantOrderTransition(tx, {
          id: orderId,
          clientId,
          targetStatus: "annulee",
          allowedPreviousStatuses: ["recue"],
        }),
      ),
    ).rejects.toThrow("Snapshot de commission introuvable");
    const result = await pool.query<{ statut: string }>(
      "SELECT statut FROM commandes WHERE id = $1",
      [orderId],
    );
    expect(result.rows[0]?.statut).toBe("recue");
  });

  it("serializes concurrent cancellation and service into one coherent result", async () => {
    const { transactionalDb } = await import("@/infrastructure/db/transaction");
    const { applyLegacyRestaurantOrderTransition } = await import("@/modules/orders/server");
    const orderId = await createPendingOrder("prete");
    await Promise.all([
      transactionalDb.transaction((tx) =>
        applyLegacyRestaurantOrderTransition(tx, { id: orderId, restaurantId, targetStatus: "annulee" }),
      ),
      transactionalDb.transaction((tx) =>
        applyLegacyRestaurantOrderTransition(tx, { id: orderId, restaurantId, targetStatus: "servie" }),
      ),
    ]);
    expect([
      { statut: "annulee", commercial_status: "void" },
      { statut: "servie", commercial_status: "due" },
    ]).toContainEqual(await state(orderId));
  });

  it("enforces dish schedules in the server-authoritative eligibility check", async () => {
    const { assertRestaurantDishesOrderable } = await import("@/modules/menu/server");
    await expect(
      assertRestaurantDishesOrderable(restaurantId, [dishId], {
        now: new Date("2026-08-13T14:00:00Z"),
      }),
    ).resolves.toHaveLength(1);
    await expect(
      assertRestaurantDishesOrderable(restaurantId, [dishId], {
        now: new Date("2026-08-13T18:00:00Z"),
      }),
    ).rejects.toThrow("commandables");
  }, 60_000);

  it("supports causal actors while keeping admin references restricted", async () => {
    const constraint = await pool.query<{ delete_action: string; nullable: string }>(
      `SELECT rc.delete_rule AS delete_action, c.is_nullable AS nullable
       FROM information_schema.referential_constraints rc
       JOIN information_schema.key_column_usage kcu
         ON kcu.constraint_schema = rc.constraint_schema
        AND kcu.constraint_name = rc.constraint_name
       JOIN information_schema.columns c
         ON c.table_schema = kcu.table_schema
        AND c.table_name = kcu.table_name
        AND c.column_name = kcu.column_name
       WHERE kcu.table_name = 'audit_log'
         AND kcu.column_name = 'admin_id'`,
    );
    expect(constraint.rows[0]).toEqual({ delete_action: "RESTRICT", nullable: "YES" });

    const actorColumns = await pool.query<{ column_name: string; is_nullable: string }>(
      `SELECT column_name, is_nullable
       FROM information_schema.columns
       WHERE table_name = 'audit_log'
         AND column_name IN ('actor_type', 'actor_id')
       ORDER BY column_name`,
    );
    expect(actorColumns.rows).toEqual([
      { column_name: "actor_id", is_nullable: "NO" },
      { column_name: "actor_type", is_nullable: "NO" },
    ]);
  });

  it("returns the same effective plan with db and tx, then falls back after expiry", async () => {
    const { db } = await import("@/infrastructure/db");
    const { transactionalDb } = await import("@/infrastructure/db/transaction");
    const { getEffectivePlan } = await import("@/modules/subscriptions/server");
    const direct = await getEffectivePlan(partnerAccountId, { executor: db });
    const transactional = await transactionalDb.transaction((tx) =>
      getEffectivePlan(partnerAccountId, { executor: tx }),
    );
    expect(direct.period?.tauxCommissionBpsFige).toBe(777);
    expect(transactional).toEqual(direct);

    await pool.query(
      "UPDATE subscription_periods SET statut = 'expiree', ended_at = NOW(), end_reason = 'expiration_naturelle' WHERE id = $1",
      [periodId],
    );
    const fallbackDb = await getEffectivePlan(partnerAccountId, { executor: db });
    const fallbackTx = await transactionalDb.transaction((tx) =>
      getEffectivePlan(partnerAccountId, { executor: tx }),
    );
    expect(fallbackDb).toMatchObject({ plan: { code: "decouverte" }, period: null });
    expect(fallbackTx).toEqual(fallbackDb);
  });
});
