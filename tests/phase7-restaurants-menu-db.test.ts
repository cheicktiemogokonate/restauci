import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import {
  warmApplicationDatabaseConnections,
  warmNeonTestPool,
} from "./support/neon-test-connection";

const enabled = process.env.RUN_PHASE7_DB_TESTS === "true";
const allowDevelopment =
  process.env.ALLOW_DEVELOPMENT_PHASE7_DB_TESTS === "true";
const databaseUrl = process.env.DATABASE_URL;
if (enabled && (!databaseUrl || !allowDevelopment)) {
  throw new Error(
    "Les tests DB Phase 7 exigent DATABASE_URL et ALLOW_DEVELOPMENT_PHASE7_DB_TESTS=true",
  );
}
const describeDb = enabled ? describe : describe.skip;

describeDb("phase 7 Restaurant/Menu ownership", () => {
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
  const restaurantIds = [crypto.randomUUID(), crypto.randomUUID()];
  const categoryIds = [crypto.randomUUID(), crypto.randomUUID()];
  const scheduleIds = [crypto.randomUUID(), crypto.randomUUID()];
  let menu: typeof import("@/modules/menu/server");
  let restaurants: typeof import("@/modules/restaurants/server");
  let createdDishId: string;

  beforeAll(async () => {
    await warmNeonTestPool(pool);
    menu = await import("@/modules/menu/server");
    restaurants = await import("@/modules/restaurants/server");
    await warmApplicationDatabaseConnections();
    await pool.query(
      `INSERT INTO users (id, nom, email, password, telephone, role, created_at, updated_at)
       VALUES
       ($1, 'Restaurant Phase 7 A', $2, 'x', $3, 'partner', NOW(), NOW()),
       ($4, 'Restaurant Phase 7 B', $5, 'x', $6, 'partner', NOW(), NOW())`,
      [
        userIds[0],
        `restaurant-a-phase7-${suffix}@example.test`,
        `+22571${suffix.replaceAll("-", "").slice(0, 8)}`,
        userIds[1],
        `restaurant-b-phase7-${suffix}@example.test`,
        `+22572${suffix.replaceAll("-", "").slice(0, 8)}`,
      ],
    );
    await pool.query(
      `INSERT INTO partner_accounts (id, user_id, activity_type, created_at, updated_at)
       VALUES ($1, $2, 'restaurant', NOW(), NOW()), ($3, $4, 'restaurant', NOW(), NOW())`,
      [partnerAccountIds[0], userIds[0], partnerAccountIds[1], userIds[1]],
    );
    await pool.query(
      `INSERT INTO restaurants (
         id, partner_account_id, nom, slug, telephone, adresse,
         latitude, longitude, actif, en_ligne, accepte_commandes,
         created_at, updated_at
       ) VALUES
       ($1, $2, 'Restaurant Phase 7 A', $3, '+2250101010101', 'Abidjan', 5.32, -4.01, true, true, true, NOW(), NOW()),
       ($4, $5, 'Restaurant Phase 7 B', $6, '+2250202020202', 'Bouaké', 7.69, -5.03, true, true, true, NOW(), NOW())`,
      [
        restaurantIds[0],
        partnerAccountIds[0],
        `restaurant-a-phase7-${suffix}`,
        restaurantIds[1],
        partnerAccountIds[1],
        `restaurant-b-phase7-${suffix}`,
      ],
    );
    await pool.query(
      `INSERT INTO creneaux_horaires (
         id, restaurant_id, nom, heure_ouverture, heure_fermeture,
         jours_actifs, actif, created_at, updated_at
       ) VALUES
       ($1, $2, 'Service A', '08:00', '18:00', ARRAY['lun'], true, NOW(), NOW()),
       ($3, $4, 'Service B', '08:00', '18:00', ARRAY['lun'], true, NOW(), NOW())`,
      [scheduleIds[0], restaurantIds[0], scheduleIds[1], restaurantIds[1]],
    );
    await pool.query(
      `INSERT INTO categories (
         id, restaurant_id, nom, ordre, publication_intent,
         first_published_at, created_at, updated_at
       ) VALUES
       ($1, $2, 'Carte A', 0, true, NOW(), NOW(), NOW()),
       ($3, $4, 'Carte B', 0, true, NOW(), NOW(), NOW())`,
      [categoryIds[0], restaurantIds[0], categoryIds[1], restaurantIds[1]],
    );
  }, 90_000);

  afterAll(async () => {
    await pool.query("DELETE FROM plats WHERE restaurant_id = ANY($1::varchar[])", [
      restaurantIds,
    ]);
    await pool.query(
      "DELETE FROM categories WHERE restaurant_id = ANY($1::varchar[])",
      [restaurantIds],
    );
    await pool.query(
      "DELETE FROM creneaux_horaires WHERE restaurant_id = ANY($1::varchar[])",
      [restaurantIds],
    );
    await pool.query("DELETE FROM restaurants WHERE id = ANY($1::varchar[])", [
      restaurantIds,
    ]);
    await pool.query(
      "DELETE FROM partner_accounts WHERE id = ANY($1::uuid[])",
      [partnerAccountIds],
    );
    await pool.query("DELETE FROM users WHERE id = ANY($1::varchar[])", [
      userIds,
    ]);
    await pool.end();
  }, 90_000);

  it("rejects a category owned by another Restaurant in the application command", async () => {
    await expect(
      menu.createMenuDish({
        restaurantId: restaurantIds[0]!,
        ownerUserId: userIds[0]!,
        nom: "Plat hors périmètre",
        prix: 2_500,
        categorieId: categoryIds[1],
        disponible: true,
        ordre: 0,
        tags: [],
        allergenes: [],
      }),
    ).rejects.toMatchObject({ code: "CATEGORY_NOT_FOUND" });
  });

  it("enforces category and schedule ownership at the database boundary", async () => {
    await expect(
      pool.query(
        `INSERT INTO plats (
           id, restaurant_id, categorie_id, nom, prix, created_at, updated_at
         ) VALUES ($1, $2, $3, 'Plat SQL invalide', 2500, NOW(), NOW())`,
        [crypto.randomUUID(), restaurantIds[0], categoryIds[1]],
      ),
    ).rejects.toMatchObject({
      code: "23503",
      constraint: "plats_restaurant_category_fk",
    });
    await expect(
      pool.query(
        `INSERT INTO categories (
           id, restaurant_id, creneau_id, nom, created_at, updated_at
         ) VALUES ($1, $2, $3, 'Catégorie horaire invalide', NOW(), NOW())`,
        [crypto.randomUUID(), restaurantIds[0], scheduleIds[1]],
      ),
    ).rejects.toMatchObject({
      code: "23503",
      constraint: "categories_restaurant_schedule_fk",
    });
    await expect(
      pool.query(
        `INSERT INTO plats (
           id, restaurant_id, categorie_id, creneau_id, nom, prix,
           created_at, updated_at
         ) VALUES ($1, $2, $3, $4, 'Plat horaire invalide', 2500, NOW(), NOW())`,
        [
          crypto.randomUUID(),
          restaurantIds[0],
          categoryIds[0],
          scheduleIds[1],
        ],
      ),
    ).rejects.toMatchObject({
      code: "23503",
      constraint: "plats_restaurant_schedule_fk",
    });
  });

  it("keeps category names unique inside one Restaurant", async () => {
    await expect(
      pool.query(
        `INSERT INTO categories (
           id, restaurant_id, nom, created_at, updated_at
         ) VALUES ($1, $2, '  CARTE A  ', NOW(), NOW())`,
        [crypto.randomUUID(), restaurantIds[0]],
      ),
    ).rejects.toMatchObject({
      code: "23505",
      constraint: "categories_restaurant_name_unique",
    });
  });

  it("creates and updates dishes only through categories owned by the Restaurant", async () => {
    const dish = await menu.createMenuDish({
      restaurantId: restaurantIds[0]!,
      ownerUserId: userIds[0]!,
      nom: "Plat Phase 7",
      prix: 3_000,
      categorieId: categoryIds[0],
      disponible: true,
      ordre: 0,
      tags: [],
      allergenes: [],
    });
    createdDishId = dish.id;
    await expect(
      menu.updateMenuDish({
        restaurantId: restaurantIds[0]!,
        ownerUserId: userIds[0]!,
        dishId: dish.id,
        categorieId: categoryIds[1],
      }),
    ).rejects.toMatchObject({ code: "CATEGORY_NOT_FOUND" });

    const workspace = await menu.getMenuManagementWorkspace({
      restaurantId: restaurantIds[0]!,
      page: 1,
      limit: 20,
    });
    expect(workspace.categories.map((category) => category.id)).toEqual([
      categoryIds[0],
    ]);
    expect(workspace.dishes.map((item) => item.id)).toEqual([dish.id]);
  });

  it("detaches category and dish references before deleting a Restaurant schedule", async () => {
    await pool.query(
      "UPDATE categories SET creneau_id = $1 WHERE id = $2 AND restaurant_id = $3",
      [scheduleIds[0], categoryIds[0], restaurantIds[0]],
    );
    await pool.query(
      "UPDATE plats SET creneau_id = $1 WHERE id = $2 AND restaurant_id = $3",
      [scheduleIds[0], createdDishId, restaurantIds[0]],
    );

    await restaurants.deleteRestaurantSchedule(
      restaurantIds[0]!,
      scheduleIds[0]!,
    );
    const state = await pool.query(
      `SELECT
         (SELECT creneau_id FROM categories WHERE id = $1) AS category_schedule,
         (SELECT creneau_id FROM plats WHERE id = $2) AS dish_schedule,
         (SELECT COUNT(*)::int FROM creneaux_horaires WHERE id = $3) AS schedule_count`,
      [categoryIds[0], createdDishId, scheduleIds[0]],
    );
    expect(state.rows[0]).toEqual({
      category_schedule: null,
      dish_schedule: null,
      schedule_count: 0,
    });
  });
});
