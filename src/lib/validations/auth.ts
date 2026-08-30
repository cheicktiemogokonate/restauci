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

const COMMON_PASSWORDS = new Set([
  "123456789012",
  "azertyuiop12",
  "letmein123456",
  "password1234",
  "qwertyuiop12",
]);

export const strongPasswordSchema = z
  .string()
  .min(12, "Le mot de passe doit contenir au moins 12 caractères")
  .max(128, "Le mot de passe ne doit pas dépasser 128 caractères")
  .refine(
    (password) => !COMMON_PASSWORDS.has(password.toLowerCase()),
    "Ce mot de passe est trop courant",
  );

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
