import { migrationPool } from "../../drizzle/db-pool.ts";

async function main() {
  const repair = process.argv.includes("--repair");
  let releasedDangling = 0;
  if (repair) {
    const released = await migrationPool.query(`
      UPDATE public_media_assets AS asset
      SET status = 'temporary',
          target_type = NULL,
          target_id = NULL,
          attached_at = NULL,
          expires_at = NOW(),
          updated_at = NOW()
      WHERE asset.status = 'attached'
        AND CASE asset.target_type
          WHEN 'restaurant_logo' THEN NOT EXISTS (
            SELECT 1 FROM restaurants target
            WHERE target.id = asset.target_id AND target.logo_url = asset.public_url
          )
          WHEN 'restaurant_banner' THEN NOT EXISTS (
            SELECT 1 FROM restaurants target
            WHERE target.id = asset.target_id AND target.banniere_url = asset.public_url
          )
          WHEN 'dish_photo' THEN NOT EXISTS (
            SELECT 1 FROM plats target
            WHERE target.id = asset.target_id AND target.photo_url = asset.public_url
          )
          WHEN 'residence_photo' THEN NOT EXISTS (
            SELECT 1 FROM residence_images target
            WHERE target.residence_id::text = asset.target_id
              AND target.url = asset.public_url
          )
        END
      RETURNING asset.id
    `);
    releasedDangling = released.rowCount ?? 0;
  }

  const result = await migrationPool.query(`
  SELECT
    COUNT(*) FILTER (WHERE status = 'temporary')::int AS temporary,
    COUNT(*) FILTER (WHERE status = 'temporary' AND expires_at <= NOW())::int AS expired,
    COUNT(*) FILTER (WHERE status = 'attached')::int AS attached,
    COUNT(*) FILTER (WHERE status = 'deleting')::int AS deleting,
    COUNT(*) FILTER (
      WHERE status = 'attached'
        AND CASE target_type
          WHEN 'restaurant_logo' THEN NOT EXISTS (
            SELECT 1 FROM restaurants r
            WHERE r.id = target_id AND r.logo_url = public_url
          )
          WHEN 'restaurant_banner' THEN NOT EXISTS (
            SELECT 1 FROM restaurants r
            WHERE r.id = target_id AND r.banniere_url = public_url
          )
          WHEN 'dish_photo' THEN NOT EXISTS (
            SELECT 1 FROM plats p
            WHERE p.id = target_id AND p.photo_url = public_url
          )
          WHEN 'residence_photo' THEN NOT EXISTS (
            SELECT 1 FROM residence_images i
            WHERE i.residence_id::text = target_id AND i.url = public_url
          )
        END
    )::int AS dangling
  FROM public_media_assets
  `);

  const row = result.rows[0] ?? {};
  console.log(
    JSON.stringify({
      mode: repair ? "repair" : "read-only",
      releasedDangling,
      ...row,
    }),
  );
  if (
    Number(row.expired ?? 0) > 0 ||
    Number(row.deleting ?? 0) > 0 ||
    Number(row.dangling ?? 0) > 0
  ) {
    process.exitCode = 1;
  }
  await migrationPool.end();
}

void main().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
  await migrationPool.end().catch(() => undefined);
});
