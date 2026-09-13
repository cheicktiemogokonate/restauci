import { z } from "zod";
import { emailSchema, strongPasswordSchema } from "@/shared/security";

export { emailSchema, strongPasswordSchema } from "@/shared/security";

/**
 * Schéma de validation pour l'inscription
 */
export const registerSchema = z.object({
  email: emailSchema,
  password: strongPasswordSchema,
  nom: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  telephone: z.string().min(10, "Le téléphone doit être valide"),
});

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Schéma de validation pour la connexion
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Mot de passe requis").max(128),
  otp: z.string().regex(/^\d{6}$/).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
