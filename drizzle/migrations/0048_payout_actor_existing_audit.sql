-- Phase 14 — audit bloquant des associations créées avant le garde 0047.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM payment_provider_accounts AS provider_account
    JOIN partner_accounts AS partner_account
      ON partner_account.id = provider_account.partner_account_id
    WHERE provider_account.linked_by_user_id IS NOT NULL
      AND provider_account.linked_by_user_id <> partner_account.user_id
  ) THEN
    RAISE EXCEPTION 'Réconciliation Phase 14: destination liée à un autre propriétaire';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM payment_provider_accounts AS provider_account
    JOIN users AS actor
      ON actor.id = provider_account.linked_by_admin_id
    WHERE provider_account.linked_by_admin_id IS NOT NULL
      AND actor.role::text <> 'admin'
  ) THEN
    RAISE EXCEPTION 'Réconciliation Phase 14: acteur de secours non administrateur';
  END IF;
END $$;
