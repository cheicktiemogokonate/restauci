import { z } from "zod";

/**
 * Schéma de validation pour l'inscription
 */
export const registerSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  nom: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  telephone: z.string().min(10, "Le téléphone doit être valide"),
  role: z.enum(["restaurateur", "admin"]).default("restaurateur"),
});

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Schéma de validation pour la connexion
 */
export const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

export type LoginInput = z.infer<typeof loginSchema>;
