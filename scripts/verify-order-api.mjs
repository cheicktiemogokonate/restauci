import { readFileSync } from "node:fs";
import { SignJWT } from "jose";
import pg from "pg";

const values = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .flatMap((line) => {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      return match ? [[match[1], match[2].replace(/^['"]|['"]$/g, "")]] : [];
    }),
);
if (!values.DATABASE_URL || !values.JWT_SECRET) {
  throw new Error("DATABASE_URL et JWT_SECRET sont requis");
}

const baseUrl = process.env.ORDER_API_BASE_URL ?? "http://127.0.0.1:3210";
const pool = new pg.Pool({ connectionString: values.DATABASE_URL, max: 4 });
const suffix = crypto.randomUUID();
const ids = {
  user: crypto.randomUUID(),
  account: crypto.randomUUID(),
  restaurant: crypto.randomUUID(),
  category: crypto.randomUUID(),
  dish: crypto.randomUUID(),
  outQuotaDish: crypto.randomUUID(),
  fillerDishes: Array.from({ length: 19 }, () => crypto.randomUUID()),
  clientA: crypto.randomUUID(),
  clientB: crypto.randomUUID(),
};
const restaurantSlug = `block5-${suffix}`;

async function tokenFor(clientId) {
  return new SignJWT({ clientId, type: "client" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(new TextEncoder().encode(values.JWT_SECRET));
}

async function post(payload, token) {
  const response = await fetch(`${baseUrl}/api/v1/client/commandes`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  return { status: response.status, body: await response.json() };
}

const payload = (key, quantity = 2, dishId = ids.dish) => ({
  restaurantSlug,
  modeCommande: "livraison",
  adresseLivraison: "Adresse de test",
  items: [{ platId: dishId, quantite: quantity }],
  idempotencyKey: key,
});

try {
  await pool.query(
    `INSERT INTO users(id,email,password,role,nom,telephone,created_at,updated_at)
     VALUES($1,$2,'x','partner','Block 5 API','+2250000000099',now(),now())`,
    [ids.user, `block5-${suffix}@example.test`],
  );
  await pool.query(
    `INSERT INTO partner_accounts(id,user_id,activity_type,created_at,updated_at)
     VALUES($1,$2,'restaurant',now(),now())`,
    [ids.account, ids.user],
  );
  await pool.query(
    `INSERT INTO restaurants(
       id,partner_account_id,nom,slug,telephone,adresse,latitude,longitude,
       frais_livraison,commande_minimum,modes_commande,actif,en_ligne,
       accepte_commandes,created_at,updated_at
     ) VALUES($1,$2,'Block 5 API',$3,'+2250000000099','Test',0,0,500,5000,
       ARRAY['livraison','emporter'],true,true,true,now(),now())`,
    [ids.restaurant, ids.account, restaurantSlug],
  );
  await pool.query(
    `INSERT INTO categories(
       id,restaurant_id,nom,publication_intent,first_published_at,created_at,updated_at
     ) VALUES($1,$2,'Test',true,now(),now(),now())`,
    [ids.category, ids.restaurant],
  );
  await pool.query(
    `INSERT INTO plats(
       id,restaurant_id,categorie_id,nom,prix,disponible,publication_intent,
       first_published_at,created_at,updated_at
     ) VALUES($1,$2,$3,'Attiéké poisson',3500,true,true,now()-interval '2 hours',now()-interval '2 hours',now())`,
    [ids.dish, ids.restaurant, ids.category],
  );
  for (const [index, dishId] of ids.fillerDishes.entries()) {
    await pool.query(
      `INSERT INTO plats(
         id,restaurant_id,categorie_id,nom,prix,disponible,publication_intent,
         first_published_at,created_at,updated_at
       ) VALUES($1,$2,$3,$4,1000,true,true,now()-interval '1 hour',now()-interval '1 hour',now())`,
      [dishId, ids.restaurant, ids.category, `Remplissage ${index + 1}`],
    );
  }
  await pool.query(
    `INSERT INTO plats(
       id,restaurant_id,categorie_id,nom,prix,disponible,publication_intent,
       first_published_at,created_at,updated_at
     ) VALUES($1,$2,$3,'Hors quota',1000,true,true,now(),now(),now())`,
    [ids.outQuotaDish, ids.restaurant, ids.category],
  );
  await pool.query(
    `INSERT INTO clients(id,nom,telephone,email,actif,created_at,updated_at)
     VALUES($1,'Client A',$3,$5,true,now(),now()),($2,'Client B',$4,$6,true,now(),now())`,
    [
      ids.clientA,
      ids.clientB,
      `+22501${suffix.slice(0, 8)}`,
      `+22502${suffix.slice(0, 8)}`,
      `client-a-${suffix}@example.test`,
      `client-b-${suffix}@example.test`,
    ],
  );

  const [tokenA, tokenB] = await Promise.all([
    tokenFor(ids.clientA),
    tokenFor(ids.clientB),
  ]);
  const unauthenticated = await post(payload(crypto.randomUUID()));
  const forgedPrice = await post(
    { ...payload(crypto.randomUUID()), price: 100, total: 100, deliveryFee: 0 },
    tokenA,
  );

  const concurrentKey = crypto.randomUUID();
  const concurrent = await Promise.all([
    post(payload(concurrentKey), tokenA),
    post(payload(concurrentKey), tokenA),
  ]);
  const concurrentIds = concurrent.map((result) => result.body.data?.commande?.id);
  const standard = concurrent.find((result) => result.body.data?.commande)?.body.data.commande;

  const conflict = await post(payload(concurrentKey, 1), tokenA);
  const sameKeyOtherClient = await post(payload(concurrentKey), tokenB);

  await pool.query("UPDATE plats SET prix=4000 WHERE id=$1", [ids.dish]);
  await pool.query("UPDATE restaurants SET frais_livraison=1000 WHERE id=$1", [ids.restaurant]);
  const repriced = await post(payload(crypto.randomUUID()), tokenA);
  const historical = await pool.query(
    "SELECT items,frais_livraison,total FROM commandes WHERE id=$1",
    [standard.id],
  );

  const unsupportedMode = await post(
    { ...payload(crypto.randomUUID()), modeCommande: "sur_place", numeroTable: "1" },
    tokenA,
  );
  const minimum = await post(payload(crypto.randomUUID(), 1), tokenA);
  await pool.query("UPDATE plats SET disponible=false WHERE id=$1", [ids.dish]);
  const unavailable = await post(payload(crypto.randomUUID()), tokenA);
  const outOfQuota = await post(
    payload(crypto.randomUUID(), 1, ids.outQuotaDish),
    tokenA,
  );

  console.log(
    JSON.stringify({
      authRejected: unauthenticated.status === 401,
      forgedFinancialFieldsRejected: forgedPrice.status === 422,
      standardOrder:
        standard?.sousTotal === 7000 &&
        standard?.fraisLivraison === 500 &&
        standard?.total === 7500 &&
        standard?.items?.[0]?.totalLigne === 7000,
      concurrentExactlyOne:
        new Set(concurrentIds).size === 1 &&
        concurrent.some((result) => result.status === 201) &&
        concurrent.some((result) => result.status === 200),
      sameKeyDifferentPayloadConflict: conflict.status === 409,
      sameKeyTwoClientsIndependent: sameKeyOtherClient.status === 201,
      serverRepricing:
        repriced.body.data?.commande?.sousTotal === 8000 &&
        repriced.body.data?.commande?.fraisLivraison === 1000 &&
        repriced.body.data?.commande?.total === 9000,
      immutableSnapshot:
        historical.rows[0]?.items?.[0]?.prix === 3500 &&
        historical.rows[0]?.items?.[0]?.totalLigne === 7000 &&
        historical.rows[0]?.frais_livraison === 500 &&
        historical.rows[0]?.total === 7500,
      unsupportedModeRejected: unsupportedMode.status === 422,
      minimumUsesSubtotal: minimum.status === 422,
      unavailableRejected: unavailable.status === 422,
      outOfQuotaRejected: outOfQuota.status === 422,
    }),
  );
} finally {
  await new Promise((resolve) => setTimeout(resolve, 500));
  await pool.query("DELETE FROM notifications WHERE restaurant_id=$1", [ids.restaurant]).catch(() => {});
  await pool.query("DELETE FROM commandes WHERE restaurant_id=$1", [ids.restaurant]).catch(() => {});
  await pool.query("DELETE FROM plats WHERE restaurant_id=$1", [ids.restaurant]).catch(() => {});
  await pool.query("DELETE FROM categories WHERE restaurant_id=$1", [ids.restaurant]).catch(() => {});
  await pool.query("DELETE FROM restaurants WHERE id=$1", [ids.restaurant]).catch(() => {});
  await pool.query("DELETE FROM partner_accounts WHERE id=$1", [ids.account]).catch(() => {});
  await pool.query("DELETE FROM users WHERE id=$1", [ids.user]).catch(() => {});
  await pool.query("DELETE FROM clients WHERE id IN ($1,$2)", [ids.clientA, ids.clientB]).catch(() => {});
  await pool.end();
}
