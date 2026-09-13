-- Phase 4 — Partner Account mono-activité et réconciliation ciblée.

-- Un Partner Account vide rattaché à un administrateur est une anomalie. Les
-- clés étrangères RESTRICT font échouer la migration plutôt que de supprimer
-- silencieusement un compte qui posséderait une donnée métier.
DELETE FROM "partner_accounts" AS account
USING "users" AS owner
WHERE owner."id" = account."user_id"
  AND owner."role" <> 'partner';
--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "restaurants" AS restaurant
    JOIN "partner_accounts" AS account
      ON account."id" = restaurant."partner_account_id"
    WHERE account."activity_type" <> 'restaurant'
  ) THEN
    RAISE EXCEPTION 'Réconciliation Phase 4: Restaurant rattaché à un compte non Restaurant';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM "residences" AS residence
    JOIN "partner_accounts" AS account
      ON account."id" = residence."partner_account_id"
    WHERE account."activity_type" <> 'residence'
  ) THEN
    RAISE EXCEPTION 'Réconciliation Phase 4: Résidence rattachée à un compte non Résidence';
  END IF;
END $$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION "enforce_partner_account_owner_and_activity"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  owner_role "role";
BEGIN
  IF TG_OP = 'UPDATE' AND NEW."activity_type" IS DISTINCT FROM OLD."activity_type" THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'partner_accounts_activity_type_immutable',
      MESSAGE = 'L''activité d''un Partner Account est immuable';
  END IF;
  SELECT "role" INTO owner_role FROM "users" WHERE "id" = NEW."user_id";
  IF owner_role IS DISTINCT FROM 'partner'::"role" THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'partner_accounts_owner_must_be_partner',
      MESSAGE = 'Un Partner Account doit appartenir à un utilisateur partenaire';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint

DROP TRIGGER IF EXISTS "partner_accounts_owner_activity_guard" ON "partner_accounts";
CREATE TRIGGER "partner_accounts_owner_activity_guard"
BEFORE INSERT OR UPDATE ON "partner_accounts"
FOR EACH ROW EXECUTE FUNCTION "enforce_partner_account_owner_and_activity"();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION "prevent_partner_owner_role_change"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."role" <> 'partner'::"role" AND EXISTS (
    SELECT 1 FROM "partner_accounts" WHERE "user_id" = NEW."id"
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'users_partner_account_role_guard',
      MESSAGE = 'Le propriétaire d''un Partner Account doit rester partenaire';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint

DROP TRIGGER IF EXISTS "users_partner_account_role_guard" ON "users";
CREATE TRIGGER "users_partner_account_role_guard"
BEFORE UPDATE OF "role" ON "users"
FOR EACH ROW EXECUTE FUNCTION "prevent_partner_owner_role_change"();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION "enforce_partner_entity_activity"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  actual_activity "activity_type";
  expected_activity "activity_type" := TG_ARGV[0]::"activity_type";
BEGIN
  SELECT "activity_type" INTO actual_activity
  FROM "partner_accounts"
  WHERE "id" = NEW."partner_account_id";
  IF actual_activity IS DISTINCT FROM expected_activity THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = TG_ARGV[1],
      MESSAGE = format(
        'Le compte partenaire doit porter l''activité %s',
        expected_activity
      );
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint

DROP TRIGGER IF EXISTS "restaurants_partner_activity_guard" ON "restaurants";
CREATE TRIGGER "restaurants_partner_activity_guard"
BEFORE INSERT OR UPDATE OF "partner_account_id" ON "restaurants"
FOR EACH ROW EXECUTE FUNCTION "enforce_partner_entity_activity"(
  'restaurant',
  'restaurants_partner_activity_match'
);
--> statement-breakpoint

DROP TRIGGER IF EXISTS "residences_partner_activity_guard" ON "residences";
CREATE TRIGGER "residences_partner_activity_guard"
BEFORE INSERT OR UPDATE OF "partner_account_id" ON "residences"
FOR EACH ROW EXECUTE FUNCTION "enforce_partner_entity_activity"(
  'residence',
  'residences_partner_activity_match'
);
