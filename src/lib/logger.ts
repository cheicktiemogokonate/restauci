import pino from "pino";
import { env } from "@/lib/env";

/**
 * Logger Pino structuré.
 * - En développement : sortie colorée lisible par l'humain
 * - En production : JSON structuré pour Vercel Logs / Datadog / etc.
 *
 * RÈGLE : Ne jamais logger de données sensibles.
 * Interdit : passwords, tokens JWT, numéros de carte, données personnelles.
 */
export const logger = pino({
  level: env.NODE_ENV === "production" ? "info" : "debug",

  // Redact automatique des champs sensibles dans tous les logs
  redact: {
    paths: [
      "password",
      "token",
      "authorization",
      "cookie",
      "*.password",
      "*.token",
      "*.secret",
      "*.jwt",
      "req.headers.authorization",
      "req.headers.cookie",
    ],
    censor: "[REDACTED]",
  },

  // Formateur lisible en développement uniquement
  transport:
    env.NODE_ENV !== "production"
      ? {
          target: "pino-pretty",
          options: {
            colorize:        true,
            translateTime:   "SYS:HH:MM:ss",
            ignore:          "pid,hostname",
            messageFormat:   "{msg}",
          },
        }
      : undefined,

  // Infos de base ajoutées à chaque log
  base: {
    env:     env.NODE_ENV,
    service: "restauci-api",
  },
});

/**
 * Crée un logger enfant avec un contexte spécifique.
 * Utilise-le dans chaque module pour identifier la source du log.
 *
 * @example
 * const log = createLogger("auth");
 * log.info({ userId }, "Connexion réussie");
 */
export function createLogger(module: string) {
  return logger.child({ module });
}