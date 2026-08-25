-- 0029 : index uniques insensibles à la casse sur les emails
--
-- Complément à la normalisation applicative (emailSchema trim+lowercase) :
-- garantit l'unicité même si une insertion contourne la validation applicative.
-- Prérequis vérifié avant application : aucun doublon lower(email) existant.
--
-- Application manuelle (cohérent avec le workflow SQL du projet) :
--   psql $DATABASE_URL -f drizzle/migrations/0029_unique_lower_email.sql

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique
  ON "users" (lower(email));

CREATE UNIQUE INDEX IF NOT EXISTS clients_email_lower_unique
  ON "clients" (lower(email))
  WHERE email IS NOT NULL;
