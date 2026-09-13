-- Phase 14 — le créateur d'une destination doit être le propriétaire exact
-- du Partner Account ou un véritable administrateur de secours.

CREATE OR REPLACE FUNCTION enforce_payment_provider_account_actor_owner()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  expected_owner_id varchar(36);
  admin_role "role";
BEGIN
  IF NEW.linked_by_user_id IS NOT NULL THEN
    SELECT user_id INTO expected_owner_id
    FROM partner_accounts
    WHERE id = NEW.partner_account_id;

    IF expected_owner_id IS DISTINCT FROM NEW.linked_by_user_id THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        CONSTRAINT = 'payment_provider_accounts_partner_actor_owner',
        MESSAGE = 'La destination de versement doit être créée par le propriétaire du Partner Account';
    END IF;
  END IF;

  IF NEW.linked_by_admin_id IS NOT NULL THEN
    SELECT role INTO admin_role
    FROM users
    WHERE id = NEW.linked_by_admin_id;

    IF admin_role IS DISTINCT FROM 'admin'::"role" THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        CONSTRAINT = 'payment_provider_accounts_admin_actor_role',
        MESSAGE = 'Une association de secours doit être réalisée par un administrateur';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint

DROP TRIGGER IF EXISTS payment_provider_accounts_actor_owner_guard
  ON payment_provider_accounts;
CREATE TRIGGER payment_provider_accounts_actor_owner_guard
BEFORE INSERT OR UPDATE OF
  partner_account_id,
  linked_by_admin_id,
  linked_by_user_id
ON payment_provider_accounts
FOR EACH ROW EXECUTE FUNCTION enforce_payment_provider_account_actor_owner();
