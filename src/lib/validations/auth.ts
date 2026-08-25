import { z } from "zod";

/**
 * Email normalisé : sans espaces et en minuscules.
 * À utiliser partout où un email est accepté en entrée, pour que le stockage
 * et les recherches (eq(users.email, ...)) soient insensibles à la casse.
 */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Email invalide");

/**
 * Schéma de validation pour l'inscription
 */
export const registerSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  nom: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  telephone: z.string().min(10, "Le téléphone doit être valide"),
});

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Schéma de validation pour la connexion
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Mot de passe requis"),
});

export type LoginInput = z.infer<typeof loginSchema>;
