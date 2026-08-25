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
  user: crypto.randomUUID(),
  account: crypto.randomUUID(),
  restaurant: crypto.randomUUID(),
  category: crypto.randomUUID(),
  dishA: crypto.randomUUID(),
  dishB: crypto.randomUUID(),
  suffix: crypto.randomUUID(),
};

try {
  await pool.query(
    `INSERT INTO users(id,email,password,role,nom,telephone,created_at,updated_at)
     VALUES($1,$2,'x','partner','Quota concurrency','+2250000000000',now(),now())`,
    [ids.user, `quota-${ids.suffix}@example.test`],
  );
  await pool.query(
    `INSERT INTO partner_accounts(id,user_id,activity_type,created_at,updated_at)
     VALUES($1,$2,'restaurant',now(),now())`,
    [ids.account, ids.user],
  );
  await pool.query(
    `INSERT INTO restaurants(id,partner_account_id,nom,slug,telephone,adresse,latitude,longitude,created_at,updated_at)
     VALUES($1,$2,'Quota concurrency',$3,'+2250000000000','Test',0,0,now(),now())`,
    [ids.restaurant, ids.account, `quota-${ids.suffix}`],
  );
  await pool.query(
    `INSERT INTO categories(id,restaurant_id,nom,publication_intent,first_published_at,created_at,updated_at)
     VALUES($1,$2,'Test',false,null,now(),now())`,
    [ids.category, ids.restaurant],
  );

  const publishCategory = () => pool.query(
    `UPDATE categories SET publication_intent=true,
       first_published_at=coalesce(first_published_at,now()) WHERE id=$1`,
    [ids.category],
  );
  await Promise.all([publishCategory(), publishCategory()]);
  const category = await pool.query(
    "SELECT first_published_at FROM categories WHERE id=$1",
    [ids.category],
  );

  await pool.query(
    `INSERT INTO plats(id,restaurant_id,categorie_id,nom,prix,publication_intent,first_published_at,created_at,updated_at)
     VALUES($1,$3,$4,'A',1000,false,null,now(),now()),
           ($2,$3,$4,'B',1000,false,null,now(),now())`,
    [ids.dishA, ids.dishB, ids.restaurant, ids.category],
  );
  const publishDish = (id) => pool.query(
    `UPDATE plats SET publication_intent=true,
       first_published_at=coalesce(first_published_at,now()) WHERE id=$1`,
    [id],
  );
  await Promise.all([publishDish(ids.dishA), publishDish(ids.dishB)]);
  const eligible = await pool.query(
    `SELECT id FROM plats WHERE restaurant_id=$1 AND first_published_at IS NOT NULL
     ORDER BY first_published_at,created_at,id LIMIT 1`,
    [ids.restaurant],
  );
  const published = await pool.query(
    "SELECT count(*)::int AS count FROM plats WHERE restaurant_id=$1 AND publication_intent",
    [ids.restaurant],
  );

  const contractClient = await pool.connect();
  let paidSnapshotUnaffected = true;
  try {
    await contractClient.query("BEGIN");
    const paid = await contractClient.query(
      `SELECT sp.id,p.id AS plan_id,spl.resource_type,spl.max_count
       FROM subscription_periods sp
       JOIN subscription_plans p ON p.code=sp.plan_code
       JOIN subscription_period_limits spl ON spl.subscription_period_id=sp.id
       WHERE sp.plan_code<>'decouverte' LIMIT 1`,
    );
    if (paid.rowCount) {
      const snapshot = paid.rows[0];
      await contractClient.query(
        `UPDATE subscription_plan_limits SET max_count=coalesce(max_count,0)+1
         WHERE plan_id=$1 AND activity_type='restaurant' AND resource_type=$2`,
        [snapshot.plan_id, snapshot.resource_type],
      );
      const after = await contractClient.query(
        `SELECT max_count FROM subscription_period_limits
         WHERE subscription_period_id=$1 AND resource_type=$2`,
        [snapshot.id, snapshot.resource_type],
      );
      paidSnapshotUnaffected = after.rows[0]?.max_count === snapshot.max_count;
    }
    await contractClient.query("ROLLBACK");
  } finally {
    contractClient.release();
  }

  console.log(JSON.stringify({
    firstPublicationSet: category.rows[0]?.first_published_at instanceof Date,
    concurrentPublished: published.rows[0]?.count,
    quotaOneEligible: eligible.rowCount,
    eligibleId: eligible.rows[0]?.id,
    paidSnapshotUnaffected,
  }));
} finally {
  await pool.query("DELETE FROM plats WHERE restaurant_id=$1", [ids.restaurant]).catch(() => {});
  await pool.query("DELETE FROM categories WHERE restaurant_id=$1", [ids.restaurant]).catch(() => {});
  await pool.query("DELETE FROM restaurants WHERE id=$1", [ids.restaurant]).catch(() => {});
  await pool.query("DELETE FROM partner_accounts WHERE id=$1", [ids.account]).catch(() => {});
  await pool.query("DELETE FROM users WHERE id=$1", [ids.user]).catch(() => {});
  await pool.end();
}
