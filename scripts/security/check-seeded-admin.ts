/**
 * Vérifie si les comptes seedés utilisent toujours le mot de passe
 * historique "password123" (fuité via git). Lecture seule : aucune écriture.
 *
 * Usage : node --env-file=.env.local --experimental-strip-types scripts/security/check-seeded-admin.ts
 */
import { compare } from "bcryptjs";
import { Pool } from "pg";

const SEEDED_EMAILS = ["admin@restauci.com", "orlando@restauci.com"];
const LEAKED_PASSWORD = "password123";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ DATABASE_URL manquant");
    process.exit(1);
  }

  const pool = new Pool({ connectionString, max: 1 });
  let compromised = false;

  try {
    for (const email of SEEDED_EMAILS) {
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
        LEAKED_PASSWORD,
        user.password,
      );

      if (usesLeakedPassword) {
        compromised = true;
        console.log(
          `🔴 ${email} (role=${user.role}, suspendu=${user.suspendu}) : ` +
            "utilise ENCORE le mot de passe fuité password123 !",
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
