/**
 * Vérification des variables d'environnement requises au démarrage
 */

const requiredEnvVars = ["DATABASE_URL", "JWT_SECRET", "CLOUDINARY_URL"];

export function validateEnv() {
  const missing = requiredEnvVars.filter((envVar) => !process.env[envVar]);

  if (missing.length > 0) {
    throw new Error(
      `Variables d'environnement manquantes: ${missing.join(", ")}. Veuillez configurer .env.local`
    );
  }

  return {
    DATABASE_URL: process.env.DATABASE_URL!,
    JWT_SECRET: process.env.JWT_SECRET!,
    CLOUDINARY_URL: process.env.CLOUDINARY_URL!,
    NODE_ENV: process.env.NODE_ENV || "development",
  };
}

// Valider au démarrage de l'application
export const env = validateEnv();
