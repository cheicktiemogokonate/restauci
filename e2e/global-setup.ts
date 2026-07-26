import { hash } from "bcryptjs";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";

const E2E_RESTAURATEUR_EMAIL = "e2e.restaurateur@restauci.test";
const E2E_RESTAURATEUR_PASSWORD = "RestauCI-e2e-2026";
const E2E_ADMIN_EMAIL = "e2e.admin@toutci.test";
const E2E_ADMIN_PASSWORD = "Toutci-admin-e2e-2026";
const E2E_ADMIN_RESTAURANT_NAME = "Restaurant à valider E2E";
const E2E_CLIENT_PHONE = "+2250700009999";
const E2E_CLIENT_PASSWORD = "Client-e2e-2026";
const E2E_COMMANDE_NUMERO = "E2E-CMD-RESTO-001";
const E2E_COMMANDE_ANNULEE_NUMERO = "E2E-ANN-001";
const E2E_COMMANDE_LIVRAISON_NUMERO = "E2E-LIV-001";
const E2E_RESTAURANT_SLUG = "restaurant-e2e-restauci";

function parseEnvFile(contents: string) {
  return Object.fromEntries(
    contents.split(/\r?\n/).flatMap((line) => {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      return match ? [[match[1], match[2].replace(/^['"]|['"]$/g, "")]] : [];
    }),
  );
}

export default async function globalSetup() {
  const testEnv = parseEnvFile(await readFile(".env.test.local", "utf8"));
  const databaseUrl = testEnv.DATABASE_URL_TEST;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL_TEST est requis pour les tests E2E.");
  }

  // Neon traite déjà sslmode=require comme verify-full. L'exprimer ici évite
  // l'avertissement de migration de pg tout en conservant le même niveau de sécurité.
  const normalizedDatabaseUrl = databaseUrl.replace(
    /([?&])sslmode=require(?=&|$)/,
    "$1sslmode=verify-full",
  );
  const pool = new Pool({ connectionString: normalizedDatabaseUrl });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const passwordHash = await hash(E2E_RESTAURATEUR_PASSWORD, 12);
    const userSeedId = randomUUID();
    const userResult = await client.query<{ id: string }>(
      `INSERT INTO users (
        id, email, password, role, nom, telephone, email_verifie, created_at, updated_at
      ) VALUES (
        $1, $2, $3, 'restaurateur', 'Restaurateur E2E', '+2250700009998', true, NOW(), NOW()
      )
       ON CONFLICT (email) DO UPDATE SET
         password = EXCLUDED.password,
         role = EXCLUDED.role,
         nom = EXCLUDED.nom,
         telephone = EXCLUDED.telephone,
         email_verifie = EXCLUDED.email_verifie,
         updated_at = NOW()
       RETURNING id`,
      [userSeedId, E2E_RESTAURATEUR_EMAIL, passwordHash],
    );
    const userId = userResult.rows[0]?.id;
    if (!userId) throw new Error("Impossible de préparer le restaurateur E2E.");

    const adminPasswordHash = await hash(E2E_ADMIN_PASSWORD, 12);
    await client.query(
      `INSERT INTO users (
        id, email, password, role, nom, telephone, email_verifie, suspendu,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, 'admin', 'Administrateur E2E', '+2250700009996', true, false,
        NOW(), NOW()
      )
       ON CONFLICT (email) DO UPDATE SET
         password = EXCLUDED.password,
         role = EXCLUDED.role,
         nom = EXCLUDED.nom,
         telephone = EXCLUDED.telephone,
         email_verifie = EXCLUDED.email_verifie,
         suspendu = false,
         updated_at = NOW()`,
      [randomUUID(), E2E_ADMIN_EMAIL, adminPasswordHash],
    );

    const pendingOwnerResult = await client.query<{ id: string }>(
      `INSERT INTO users (
        id, email, password, role, nom, telephone, email_verifie, suspendu,
        created_at, updated_at
      ) VALUES (
        $1, 'e2e.pending-owner@toutci.test', $2, 'restaurateur',
        'Partenaire à valider E2E', '+2250700009995', true, false, NOW(), NOW()
      )
       ON CONFLICT (email) DO UPDATE SET
         password = EXCLUDED.password,
         role = EXCLUDED.role,
         suspendu = false,
         updated_at = NOW()
       RETURNING id`,
      [randomUUID(), passwordHash],
    );
    const pendingOwnerId = pendingOwnerResult.rows[0]?.id;
    if (!pendingOwnerId) {
      throw new Error("Impossible de préparer le partenaire admin E2E.");
    }

    await client.query(
      `INSERT INTO restaurants (
        id, user_id, nom, slug, telephone, adresse, ville, latitude, longitude,
        modes_commande, actif, suspendu, en_ligne, accepte_commandes,
        frais_livraison, motif_rejet, motif_suspension, created_at, updated_at
      ) VALUES (
        $1, $2, $3, 'restaurant-admin-e2e', '+225270000995',
        'Cocody, Abidjan', 'Abidjan', 5.36, -4.01,
        ARRAY['sur_place'], false, false, false, false, 0, null, null, NOW(), NOW()
      ) ON CONFLICT (user_id) DO UPDATE SET
        nom = EXCLUDED.nom,
        actif = false,
        suspendu = false,
        en_ligne = false,
        accepte_commandes = false,
        motif_rejet = null,
        motif_suspension = null,
        updated_at = NOW()`,
      [randomUUID(), pendingOwnerId, E2E_ADMIN_RESTAURANT_NAME],
    );

    const restaurantResult = await client.query<{ id: string }>(
      `INSERT INTO restaurants (
        id, user_id, nom, slug, telephone, adresse, ville, latitude, longitude,
        modes_commande, actif, en_ligne, accepte_commandes, frais_livraison, created_at, updated_at
      ) VALUES (
        $1, $2, 'Restaurant E2E', 'restaurant-e2e-restauci', '+225270000999',
        'Cocody Riviera, Abidjan', 'Abidjan', 5.3599, -3.99,
        ARRAY['sur_place', 'emporter', 'livraison'], true, true, true, 0, NOW(), NOW()
      ) ON CONFLICT (user_id) DO UPDATE SET
        nom = EXCLUDED.nom,
        slug = EXCLUDED.slug,
        telephone = EXCLUDED.telephone,
        adresse = EXCLUDED.adresse,
        ville = EXCLUDED.ville,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        modes_commande = EXCLUDED.modes_commande,
        actif = EXCLUDED.actif,
        en_ligne = EXCLUDED.en_ligne,
        accepte_commandes = EXCLUDED.accepte_commandes,
        frais_livraison = EXCLUDED.frais_livraison,
        updated_at = NOW()
       RETURNING id`,
      [randomUUID(), userId],
    );
    const restaurantId = restaurantResult.rows[0]?.id;
    if (!restaurantId) throw new Error("Impossible de préparer le restaurant E2E.");

    await client.query("DELETE FROM commandes WHERE restaurant_id = $1", [restaurantId]);
    await client.query("DELETE FROM livreurs WHERE restaurant_id = $1", [restaurantId]);
    await client.query("DELETE FROM plats WHERE restaurant_id = $1", [restaurantId]);
    await client.query("DELETE FROM categories WHERE restaurant_id = $1", [restaurantId]);

    const categoryResult = await client.query<{ id: string }>(
      `INSERT INTO categories (id, restaurant_id, nom, ordre, visible, created_at, updated_at)
       VALUES ($1, $2, 'Tests E2E', 1, true, NOW(), NOW())
       RETURNING id`,
      [randomUUID(), restaurantId],
    );
    const categoryId = categoryResult.rows[0]?.id;
    if (!categoryId) throw new Error("Impossible de préparer la catégorie E2E.");

    const platResult = await client.query<{ id: string }>(
      `INSERT INTO plats (
        id, restaurant_id, categorie_id, nom, prix, disponible, ordre, created_at, updated_at
      ) VALUES ($1, $2, $3, 'Plat de validation E2E', 12000, true, 1, NOW(), NOW())
       RETURNING id`,
      [randomUUID(), restaurantId, categoryId],
    );
    const platId = platResult.rows[0]?.id;
    if (!platId) throw new Error("Impossible de préparer le plat E2E.");

    const clientPasswordHash = await hash(E2E_CLIENT_PASSWORD, 12);
    const clientResult = await client.query<{ id: string }>(
      `INSERT INTO clients (id, nom, telephone, email, password, actif, created_at, updated_at)
       VALUES ($1, 'Client E2E', $2, 'e2e.client@restauci.test', $3, true, NOW(), NOW())
       ON CONFLICT (telephone) DO UPDATE SET
         nom = EXCLUDED.nom,
         email = EXCLUDED.email,
         password = EXCLUDED.password,
         actif = EXCLUDED.actif,
         updated_at = NOW()
       RETURNING id`,
      [randomUUID(), E2E_CLIENT_PHONE, clientPasswordHash],
    );
    const clientId = clientResult.rows[0]?.id;
    if (!clientId) throw new Error("Impossible de préparer le client E2E.");

    await client.query(
      `INSERT INTO livreurs (
        id, restaurant_id, nom, telephone, vehicule, numero_vehicule, en_ligne, actif,
        created_at, updated_at
      ) VALUES (
        $1, $2, 'Livreur E2E', '+2250700009997', 'Moto', 'E2E-01', true, true, NOW(), NOW()
      )`,
      [randomUUID(), restaurantId],
    );

    const orderItems = JSON.stringify([
      { platId, nom: "Plat de validation E2E", prix: 12000, quantite: 1 },
    ]);
    const e2eOrders = [
      {
        numero: E2E_COMMANDE_NUMERO,
        mode: "sur_place",
        table: "E2E-1",
        nom: "Client E2E",
        adresse: null,
        latitude: null,
        longitude: null,
        distance: null,
      },
      {
        numero: E2E_COMMANDE_ANNULEE_NUMERO,
        mode: "emporter",
        table: null,
        nom: "Client E2E Annulation",
        adresse: null,
        latitude: null,
        longitude: null,
        distance: null,
      },
      {
        numero: E2E_COMMANDE_LIVRAISON_NUMERO,
        mode: "livraison",
        table: null,
        nom: "Client E2E Livraison",
        adresse: "Cocody Angré 8e tranche, Abidjan",
        latitude: 5.401,
        longitude: -3.967,
        distance: 4.2,
      },
    ] as const;

    for (const order of e2eOrders) {
      await client.query(
      `INSERT INTO commandes (
        id, numero, restaurant_id, client_id, mode_commande, statut, numero_table,
        nom_client, telephone_client, adresse_livraison, latitude_livraison, longitude_livraison,
        distance_km, items, sous_total, frais_livraison, remise, total,
        temps_preparation_estime, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, 'recue', $6, $7, $8, $9, $10, $11, $12,
        $13::jsonb, 12000, 0, 0, 12000, 15, NOW(), NOW()
      )`,
      [
        randomUUID(),
        order.numero,
        restaurantId,
        clientId,
        order.mode,
        order.table,
        order.nom,
        E2E_CLIENT_PHONE,
        order.adresse,
        order.latitude,
        order.longitude,
        order.distance,
        orderItems,
      ],
    );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

export const e2eCredentials = {
  email: E2E_RESTAURATEUR_EMAIL,
  password: E2E_RESTAURATEUR_PASSWORD,
  commandeNumero: E2E_COMMANDE_NUMERO,
  commandeAnnuleeNumero: E2E_COMMANDE_ANNULEE_NUMERO,
  commandeLivraisonNumero: E2E_COMMANDE_LIVRAISON_NUMERO,
  restaurantSlug: E2E_RESTAURANT_SLUG,
  clientPhone: E2E_CLIENT_PHONE,
  clientPassword: E2E_CLIENT_PASSWORD,
  adminEmail: E2E_ADMIN_EMAIL,
  adminPassword: E2E_ADMIN_PASSWORD,
  adminRestaurantName: E2E_ADMIN_RESTAURANT_NAME,
};
