/**
 * Vérifie si des comptes ciblés utilisent encore un mot de passe compromis.
 * Le secret et les identifiants sont injectés par le gestionnaire de secrets.
 *
 * Usage : node --env-file=.env.local --experimental-strip-types scripts/security/check-seeded-admin.ts
 */
import { compare } from "bcryptjs";
import { Pool } from "pg";

const seededEmails = (process.env.SECURITY_CHECK_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);
const compromisedPassword = process.env.COMPROMISED_PASSWORD;

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ DATABASE_URL manquant");
    process.exit(1);
  }
  if (seededEmails.length === 0 || !compromisedPassword) {
    console.error(
      "❌ SECURITY_CHECK_EMAILS et COMPROMISED_PASSWORD sont requis",
    );
    process.exit(1);
  }

  const pool = new Pool({ connectionString, max: 1 });
  let compromised = false;

  try {
    for (const email of seededEmails) {
      const { rows } = await pool.query(
        "SELECT id, email, role, suspendu, password FROM users WHERE email = $1 LIMIT 1",
        [email],
      );

      if (rows.length === 0) {
        console.log(`✅ ${email} : absent de la base`);
        continue;
      }

      const user = rows[0];
      const usesLeakedPassword = await compare(
        compromisedPassword,
        user.password,
      );

      if (usesLeakedPassword) {
        compromised = true;
        console.log(
          `🔴 ${email} (role=${user.role}, suspendu=${user.suspendu}) : ` +
            "utilise ENCORE le mot de passe compromis !",
        );
        console.log(
          `   → Action immédiate : changer le mot de passe ou désactiver ce compte.`,
        );
      } else {
        console.log(
          `✅ ${email} (role=${user.role}) : le mot de passe a été changé`,
        );
      }
    }
  } finally {
    await pool.end();
  }

  if (compromised) {
    console.error("\n🚨 Compte(s) à risque détecté(s) — voir ci-dessus.");
    process.exit(2);
  }
  console.log("\n✅ Aucun compte seedé avec mot de passe fuité.");
}

main().catch((err) => {
  console.error("❌ Erreur:", err instanceof Error ? err.message : err);
  process.exit(1);
});
