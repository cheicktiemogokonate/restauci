import { describe, expect, it } from "vitest";
import { Pool, type PoolClient } from "pg";
import { warmNeonTestPool } from "./support/neon-test-connection";

const enabled = process.env.RUN_DELIVERY_DB_TESTS === "true";
const databaseUrl =
  process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL_TEST;
if (enabled && !databaseUrl) {
  throw new Error("TEST_DATABASE_URL est obligatoire pour les tests DB livraison");
}
const describeDatabase = enabled ? describe : describe.skip;

async function expectRejectedAtSavepoint(
  client: PoolClient,
  name: string,
  operation: () => Promise<unknown>,
  expectedCode: string,
) {
  await client.query(`SAVEPOINT ${name}`);
  try {
    await expect(operation()).rejects.toMatchObject({ code: expectedCode });
  } finally {
    await client.query(`ROLLBACK TO SAVEPOINT ${name}`);
  }
}

describeDatabase("delivery driver database invariants", () => {
  it("enforces active work, offers, append-only events, owners and exact cash", async () => {
    const pool = new Pool({
      connectionString: databaseUrl,
      max: 1,
      connectionTimeoutMillis: 30_000,
      idleTimeoutMillis: 60_000,
      keepAlive: true,
    });
    await warmNeonTestPool(pool);
    const client = await pool.connect();
    const userId = crypto.randomUUID();
    const partnerAccountId = crypto.randomUUID();
    const restaurantId = crypto.randomUUID();
    const customerId = crypto.randomUUID();
    const driverId = crypto.randomUUID();
    const orderIds = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
    const deliveryIds = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];

    await client.query("BEGIN");
    try {
      await client.query(
        `INSERT INTO users (id, nom, email, password, telephone, role, created_at, updated_at)
         VALUES ($1, 'Delivery Test', $2, 'test-only', $3, 'partner', NOW(), NOW())`,
        [
          userId,
          `delivery-${userId}@example.test`,
          `+225${userId.replaceAll("-", "").slice(0, 10)}`,
        ],
      );
      await client.query(
        `INSERT INTO partner_accounts (id, user_id, activity_type, created_at, updated_at)
         VALUES ($1, $2, 'restaurant', NOW(), NOW())`,
        [partnerAccountId, userId],
      );
      await client.query(
        `INSERT INTO restaurants (
           id, partner_account_id, nom, slug, telephone, adresse, latitude,
           longitude, created_at, updated_at
         ) VALUES ($1, $2, 'Delivery DB', $3, '+2250000000099', 'Abidjan',
           5.3, -4, NOW(), NOW())`,
        [restaurantId, partnerAccountId, `delivery-db-${restaurantId}`],
      );
      await client.query(
        `INSERT INTO clients (id, nom, telephone, actif, created_at, updated_at)
         VALUES ($1, 'Client Delivery', $2, true, NOW(), NOW())`,
        [customerId, `+225${customerId.replaceAll("-", "").slice(0, 10)}`],
      );
      await client.query(
        `INSERT INTO livreurs (
           id, restaurant_id, nom, telephone, vehicule, login_id,
           password_hash, must_change_password, credentials_version,
           en_ligne, actif, created_at, updated_at
         ) VALUES ($1, $2, 'Livreur DB', '+2250000000098', 'moto', $3,
           'test-only', false, 1, true, true, NOW(), NOW())`,
        [driverId, restaurantId, `LIV-${driverId.replaceAll("-", "").slice(0, 16)}`],
      );
      await expectRejectedAtSavepoint(
        client,
        "invalid_fixed_compensation",
        () =>
          client.query(
            "UPDATE livreurs SET fixed_delivery_compensation_fcfa = 0 WHERE id = $1",
            [driverId],
          ),
        "23514",
      );
      for (let index = 0; index < orderIds.length; index += 1) {
        await client.query(
          `INSERT INTO commandes (
             id, numero, restaurant_id, client_id, mode_commande, statut,
             nom_client, telephone_client, adresse_livraison,
             latitude_livraison, longitude_livraison, items, sous_total,
             frais_livraison, remise, total, created_at, updated_at
           ) VALUES ($1, $2, $3, $4, 'livraison', 'en_preparation',
             'Client Delivery', '+2250000000097', 'Cocody', 5.34, -4.01,
             '[]'::jsonb, 5000, 1000, 0, 6000, NOW(), NOW())`,
          [
            orderIds[index],
            `DLV-${index}-${orderIds[index].slice(0, 8)}`,
            restaurantId,
            customerId,
          ],
        );
      }
      await client.query(
        `INSERT INTO livraisons (
           id, commande_id, livreur_id, statut, adresse, latitude, longitude,
           heure_assignee, created_at, updated_at
         ) VALUES ($1, $2, $3, 'assignee', 'Cocody', 5.34, -4.01,
           NOW(), NOW(), NOW())`,
        [deliveryIds[0], orderIds[0], driverId],
      );
      await expectRejectedAtSavepoint(
        client,
        "invalid_compensation_payment",
        () =>
          client.query(
            `UPDATE livraisons
             SET driver_compensation_amount_fcfa = 300,
                 driver_compensation_paid_at = NOW(),
                 driver_compensation_paid_by_user_id = $2
             WHERE id = $1`,
            [deliveryIds[0], userId],
          ),
        "23514",
      );
      await expectRejectedAtSavepoint(
        client,
        "active_work",
        () =>
          client.query(
            `INSERT INTO livraisons (
               id, commande_id, livreur_id, statut, adresse, latitude,
               longitude, heure_assignee, created_at, updated_at
             ) VALUES ($1, $2, $3, 'assignee', 'Cocody', 5.34, -4.01,
               NOW(), NOW(), NOW())`,
            [deliveryIds[1], orderIds[1], driverId],
          ),
        "23505",
      );

      for (let index = 1; index < deliveryIds.length; index += 1) {
        await client.query(
          `INSERT INTO livraisons (
             id, commande_id, statut, adresse, latitude, longitude,
             created_at, updated_at
           ) VALUES ($1, $2, 'en_attente', 'Cocody', 5.34, -4.01,
             NOW(), NOW())`,
          [deliveryIds[index], orderIds[index]],
        );
      }
      const firstOfferId = crypto.randomUUID();
      await client.query(
        `INSERT INTO delivery_offers (
           id, delivery_id, order_id, restaurant_id, driver_id, status,
           created_by_user_id, expires_at, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, 'pending', $6,
           NOW() + INTERVAL '5 minutes', NOW(), NOW())`,
        [firstOfferId, deliveryIds[1], orderIds[1], restaurantId, driverId, userId],
      );
      await expectRejectedAtSavepoint(
        client,
        "pending_offer",
        () =>
          client.query(
            `INSERT INTO delivery_offers (
               id, delivery_id, order_id, restaurant_id, driver_id, status,
               created_by_user_id, expires_at, created_at, updated_at
             ) VALUES ($1, $2, $3, $4, $5, 'pending', $6,
               NOW() + INTERVAL '5 minutes', NOW(), NOW())`,
            [
              crypto.randomUUID(),
              deliveryIds[2],
              orderIds[2],
              restaurantId,
              driverId,
              userId,
            ],
          ),
        "23505",
      );

      const eventId = crypto.randomUUID();
      await client.query(
        `INSERT INTO delivery_events (
           id, delivery_id, order_id, restaurant_id, driver_id, event_type,
           actor_type, actor_id, metadata, created_at
         ) VALUES ($1, $2, $3, $4, $5, 'delivery_assigned',
           'driver', $5, '{}'::jsonb, NOW())`,
        [eventId, deliveryIds[0], orderIds[0], restaurantId, driverId],
      );
      await expectRejectedAtSavepoint(
        client,
        "append_only_event",
        () =>
          client.query(
            "UPDATE delivery_events SET metadata = '{\"edited\":true}'::jsonb WHERE id = $1",
            [eventId],
          ),
        "P0001",
      );
      await expectRejectedAtSavepoint(
        client,
        "single_notification_owner",
        () =>
          client.query(
            `INSERT INTO notifications (
               id, user_id, driver_id, type, titre, message, created_at
             ) VALUES ($1, $2, $3, 'systeme', 'Test', 'Test', NOW())`,
            [crypto.randomUUID(), userId, driverId],
          ),
        "23514",
      );
      await expectRejectedAtSavepoint(
        client,
        "exact_cash",
        () =>
          client.query(
            `INSERT INTO driver_cash_remittances (
               id, restaurant_id, driver_id, expected_amount_fcfa,
               received_amount_fcfa, confirmed_by_user_id, confirmed_at,
               created_at
             ) VALUES ($1, $2, $3, 6000, 5000, $4, NOW(), NOW())`,
            [crypto.randomUUID(), restaurantId, driverId, userId],
          ),
        "23514",
      );
    } finally {
      await client.query("ROLLBACK");
      client.release();
      await pool.end();
    }
  }, 60_000);
});
