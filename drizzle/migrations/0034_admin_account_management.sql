-- 0034 : gestion sécurisée des comptes administrateurs

ALTER TYPE "audit_action"
  ADD VALUE IF NOT EXISTS 'admin_account_created';

ALTER TYPE "audit_action"
  ADD VALUE IF NOT EXISTS 'admin_account_suspended';

ALTER TYPE "audit_action"
  ADD VALUE IF NOT EXISTS 'admin_account_reactivated';

ALTER TYPE "audit_action"
  ADD VALUE IF NOT EXISTS 'admin_password_reset';
