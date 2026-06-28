import { z } from "zod";

const envSchema = z.object({
  // ── Base de donnees ──────────────────────────────────────────
  DATABASE_URL: z.string()
    .url()
    .describe("URL de connexion PostgreSQL (Neon)"),

  // ── Authentification ─────────────────────────────────────────
  JWT_SECRET: z.string()
    .min(32, "JWT_SECRET doit contenir au moins 32 caracteres")
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

  // ── Upload medias ─────────────────────────────────────────────
  CLOUDINARY_URL: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // ── Web Push (VAPID) ─────────────────────────────────────────
  VAPID_PUBLIC_KEY: z.string().min(1).optional(),
  VAPID_PRIVATE_KEY: z.string().min(1).optional(),
  VAPID_EMAIL: z.string().min(1).optional(),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().min(1).optional(),

  // ── Expo Push ────────────────────────────────────────────────
  EXPO_ACCESS_TOKEN: z.string().optional(),

  // ── Application ───────────────────────────────────────────────
  NEXT_PUBLIC_APP_URL: z.string()
    .url()
    .describe("URL publique de l'application"),

  NEXT_PUBLIC_APP_NAME: z.string()
    .default("RestauCI")
    .describe("Nom de l'application"),

  NODE_ENV: z.enum(["development", "production", "test"]) 
    .default("development"),
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