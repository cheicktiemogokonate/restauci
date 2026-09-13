/**
 * Récupération hors interface d'un compte administrateur verrouillé.
 *
 * Usage:
 * ADMIN_RECOVERY_EMAIL=admin@example.com npm run security:admin:reset
 *
 * Le nouveau mot de passe aléatoire n'est affiché qu'une fois. Aucun mot de passe
 * n'est accepté en argument afin d'éviter les fuites dans l'historique shell.
 */
import { randomBytes, randomUUID } from "node:crypto";
import { hash } from "bcryptjs";
import { Pool } from "pg";

const email = process.env.ADMIN_RECOVERY_EMAIL?.trim().toLowerCase();
const connectionString =
  process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;

if (!email || !email.includes("@")) {
  throw new Error("ADMIN_RECOVERY_EMAIL est requis.");
}
if (!connectionString) {
  throw new Error("DATABASE_MIGRATION_URL ou DATABASE_URL est requis.");
}

const temporaryPassword = randomBytes(12).toString("base64url") + "aA7!";
const passwordHash = await hash(temporaryPassword, 12);
const pool = new Pool({ connectionString, max: 1 });
const client = await pool.connect();

try {
  await client.query("BEGIN");
  const result = await client.query<{ id: string; email: string }>(
    [
      "UPDATE users",
      "SET password = $1, suspendu = FALSE, motif_suspension = NULL,",
      "suspendu_at = NULL, updated_at = NOW()",
      "WHERE lower(email) = $2 AND role = 'admin'",
      "RETURNING id, email",
    ].join(" "),
    [passwordHash, email],
  );
  const admin = result.rows[0];
  if (!admin) throw new Error("Compte administrateur introuvable.");

  await client.query(
    [
      "INSERT INTO audit_log",
      "(id, admin_id, action, ressource_type, ressource_id, details, created_at)",
      "VALUES ($1, $2, 'admin_password_reset', 'admin_account', $2, $3, NOW())",
    ].join(" "),
    [
      randomUUID(),
      admin.id,
      JSON.stringify({ email: admin.email, channel: "break_glass_cli" }),
    ],
  );
  await client.query("COMMIT");
  console.log("Compte récupéré : " + admin.email);
  console.log("Nouveau mot de passe (affiché une fois) : " + temporaryPassword);
  console.log("Conservez-le dans un gestionnaire de mots de passe.");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
