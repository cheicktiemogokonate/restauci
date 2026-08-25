import { readFileSync } from "node:fs";
import pg from "pg";

const databaseLine = readFileSync(".env.local", "utf8")
  .split(/\r?\n/)
  .find((line) => line.trim().startsWith("DATABASE_URL="));
if (!databaseLine) throw new Error("DATABASE_URL absente");
let databaseUrl = databaseLine.slice(databaseLine.indexOf("=") + 1).trim();
if (
  (databaseUrl.startsWith('"') && databaseUrl.endsWith('"')) ||
  (databaseUrl.startsWith("'") && databaseUrl.endsWith("'"))
) {
  databaseUrl = databaseUrl.slice(1, -1);
}

const pool = new pg.Pool({ connectionString: databaseUrl, max: 4 });
const ids = {
  clientA: crypto.randomUUID(),
  clientB: crypto.randomUUID(),
  key: crypto.randomUUID(),
  orderA: crypto.randomUUID(),
  orderB: crypto.randomUUID(),
  orderC: crypto.randomUUID(),
  suffix: crypto.randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase(),
};
const hashA = "a".repeat(64);
const hashB = "b".repeat(64);

try {
  const restaurant = await pool.query("SELECT id FROM restaurants LIMIT 1");
  if (!restaurant.rowCount) throw new Error("Aucun restaurant de test disponible");
  const restaurantId = restaurant.rows[0].id;

  await pool.query(
    `INSERT INTO clients(id,nom,telephone,created_at,updated_at)
     VALUES($1,'Idempotence A',$3,now(),now()),($2,'Idempotence B',$4,now(),now())`,
    [ids.clientA, ids.clientB, `+22501${ids.suffix}`, `+22502${ids.suffix}`],
  );

  const insert = (orderId, clientId, hash, numberSuffix) =>
    pool.query(
      `INSERT INTO commandes(
        id,numero,restaurant_id,client_id,idempotency_key,idempotency_request_hash,
        mode_commande,statut,nom_client,items,sous_total,frais_livraison,remise,total,
        created_at,updated_at
      ) VALUES($1,$2,$3,$4,$5,$6,'emporter','recue','Test','[]'::jsonb,7000,0,0,7000,now(),now())
      ON CONFLICT (client_id,idempotency_key) DO NOTHING
      RETURNING id`,
      [
        orderId,
        `B5-${numberSuffix}-${ids.suffix}`,
        restaurantId,
        clientId,
        ids.key,
        hash,
      ],
    );

  const [first, second] = await Promise.all([
    insert(ids.orderA, ids.clientA, hashA, "A"),
    insert(ids.orderB, ids.clientA, hashA, "B"),
  ]);
  await insert(ids.orderC, ids.clientB, hashA, "C");

  const rows = await pool.query(
    `SELECT client_id,idempotency_request_hash
     FROM commandes WHERE idempotency_key=$1 AND client_id IN ($2,$3)`,
    [ids.key, ids.clientA, ids.clientB],
  );
  const clientARow = rows.rows.find((row) => row.client_id === ids.clientA);

  console.log(
    JSON.stringify({
      simultaneousInsertsCreated: first.rowCount + second.rowCount,
      clientAOrders: rows.rows.filter((row) => row.client_id === ids.clientA).length,
      sameKeyTwoClientsIndependent: rows.rowCount === 2,
      sameKeyDifferentPayloadConflict:
        clientARow?.idempotency_request_hash !== hashB,
    }),
  );
} finally {
  await pool
    .query("DELETE FROM commandes WHERE client_id IN ($1,$2)", [ids.clientA, ids.clientB])
    .catch(() => {});
  await pool
    .query("DELETE FROM clients WHERE id IN ($1,$2)", [ids.clientA, ids.clientB])
    .catch(() => {});
  await pool.end();
}
