INSERT INTO "subscription_plan_limits" (
  "id",
  "plan_id",
  "activity_type",
  "resource_type",
  "max_count"
)
SELECT
  gen_random_uuid()::text,
  "id",
  'residence',
  'residence',
  CASE "code"
    WHEN 'decouverte' THEN 1
    WHEN 'croissance' THEN 5
    WHEN 'partenaire_fier' THEN NULL
  END
FROM "subscription_plans"
WHERE "code" IN ('decouverte', 'croissance', 'partenaire_fier')
ON CONFLICT ("plan_id", "activity_type", "resource_type") DO NOTHING;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "subscription_plans" p
    WHERE p."code" IN ('decouverte', 'croissance', 'partenaire_fier')
      AND (
        SELECT count(*)
        FROM "subscription_plan_limits" l
        WHERE l."plan_id" = p."id"
          AND l."activity_type" = 'residence'
          AND l."resource_type" = 'residence'
      ) <> 1
  ) THEN
    RAISE EXCEPTION 'Migration quotas: catalogue Résidence incomplet';
  END IF;
END $$;
