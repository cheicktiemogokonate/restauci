import { z } from "zod";

const envSchema = z.object({
  // ── Base de donnees ──────────────────────────────────────────
  DATABASE_URL: z.string()
    .url()
    .describe("URL de connexion PostgreSQL (Neon)"),

  // ── Authentification ─────────────────────────────────────────
  JWT_SECRET: z.string()
    .min(32, "JWT_SECRET doit contenir au moins 32 caracteres")
    .refine(
      (secret) => {
        // Rejeter les secrets triviaux : répétition d'un même caractère,
        // suites évidentes, mots de passe trop « plats » (une seule classe
        // de caractères sur moins de 64 caractères).
        if (/^(.)\1+$/.test(secret)) return false;
        if (/^(?:0123|1234|abcd|aaaa|bbbb)/i.test(secret)) return false;
        const classes = [
          /[a-z]/.test(secret),
          /[A-Z]/.test(secret),
          /[0-9]/.test(secret),
          /[^a-zA-Z0-9]/.test(secret),
        ].filter(Boolean).length;
        return classes >= 3 || secret.length >= 64;
      },
      "JWT_SECRET trop faible : utiliser au minimum 32 caracteres avec 3 classes de caracteres, ou 64+ caractères (ex: openssl rand -base64 48)",
    )
    .describe("Secret pour signer les tokens JWT"),

  JWT_COOKIE_NAME: z.string()
    .default("restauci_session")
    .describe("Nom du cookie de session"),

  // ── Cache Redis (Upstash) ─────────────────────────────────────
  UPSTASH_REDIS_REST_URL: z.string()
    .url()
    .describe("URL REST Upstash Redis"),

  UPSTASH_REDIS_REST_TOKEN: z.string()
    .min(1, "UPSTASH_REDIS_REST_TOKEN manquant")
    .describe("Token Upstash Redis"),

  // Le cache de données métier reste opt-in : Redis sert déjà au temps réel
  // et au rate limiting, sans imposer de données potentiellement périmées.
  DATA_CACHE_ENABLED: z
    .enum(["true", "false"])
    .optional()
    .default("false")
    .transform((value) => value === "true"),

  // Activation progressive de la politique géographique par vertical.
  RESTAURANT_GEO_POLICY_MODE: z
    .enum(["off", "shadow", "enforce"])
    .optional()
    .default("shadow"),
  RESIDENCE_GEO_POLICY_MODE: z
    .enum(["off", "shadow", "enforce"])
    .optional()
    .default("off"),
  EVENT_GEO_POLICY_MODE: z
    .enum(["off", "shadow", "enforce"])
    .optional()
    .default("off"),

  // ── Upload medias (Cloudflare R2) ─────────────────────────────
  R2_ACCOUNT_ID: z.string().min(1).optional(),
  R2_ACCESS_KEY_ID: z.string().min(1).optional(),
  R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  R2_BUCKET_NAME: z.string().min(3).max(63).optional(),
  R2_PUBLIC_URL: z.string().url().optional(),
  // Bucket distinct, privé et sans domaine public pour les justificatifs KYC.
  R2_KYC_BUCKET_NAME: z.string().min(3).max(63).optional(),
  R2_KYC_ACCESS_KEY_ID: z.string().min(1).optional(),
  R2_KYC_SECRET_ACCESS_KEY: z.string().min(1).optional(),

  // ── Web Push (VAPID) ─────────────────────────────────────────
  VAPID_PUBLIC_KEY: z.string().min(1).optional(),
  VAPID_PRIVATE_KEY: z.string().min(1).optional(),
  VAPID_EMAIL: z.string().min(1).optional(),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().min(1).optional(),

  // ── Expo Push ────────────────────────────────────────────────
  EXPO_ACCESS_TOKEN: z.string().optional(),

  // ── Paiements Paystack (secret strictement serveur) ──────────
  PAYSTACK_SECRET_KEY: z
    .string()
    .regex(/^sk_(test|live)_[A-Za-z0-9]+$/, "PAYSTACK_SECRET_KEY invalide")
    .optional(),

  // ── Tâches planifiées ─────────────────────────────────────────
  CRON_SECRET: z.string().min(32, "CRON_SECRET doit contenir au moins 32 caractères").optional(),

  // ── Application ───────────────────────────────────────────────
  NEXT_PUBLIC_APP_URL: z.string()
    .url()
    .describe("URL publique de l'application"),

  NEXT_PUBLIC_APP_NAME: z.string()
    .default("Toutci")
    .describe("Nom de l'application"),

  // Deep link fixe et maîtrisé par le serveur. Ne jamais accepter une URL de
  // retour arbitraire fournie par le client.
  MOBILE_APP_PAYMENT_RETURN_URL: z
    .string()
    .url()
    .refine((value) => {
      const protocol = new URL(value).protocol;
      return protocol === "https:" || protocol === "toutci:";
    }, "MOBILE_APP_PAYMENT_RETURN_URL doit utiliser https:// ou toutci://")
    .optional(),

  NODE_ENV: z.enum(["development", "production", "test"]) 
    .default("development"),
}).superRefine((values, context) => {
  if (values.NODE_ENV === "production" && !values.CRON_SECRET) {
    context.addIssue({
      code: "custom",
      path: ["CRON_SECRET"],
      message: "CRON_SECRET est obligatoire en production",
    });
  }
  if (values.NODE_ENV !== "production" && values.PAYSTACK_SECRET_KEY?.startsWith("sk_live_")) {
    context.addIssue({
      code: "custom",
      path: ["PAYSTACK_SECRET_KEY"],
      message: "Une clé Paystack LIVE est interdite hors production",
    });
  }
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "Variables d'environnement invalides :\n",
    JSON.stringify(parsed.error.flatten().fieldErrors, null, 2)
  );

  throw new Error("Variables d'environnement invalides");
}

export const env = parsed.data;

export type Env = z.infer<typeof envSchema>;
