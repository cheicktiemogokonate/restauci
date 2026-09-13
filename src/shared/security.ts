import { z } from "zod";

/** Normalisation commune des identifiants e-mail acceptés par la plateforme. */
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

/** Politique de robustesse commune aux identités partenaire, admin et client. */
export const strongPasswordSchema = z
  .string()
  .min(12, "Le mot de passe doit contenir au moins 12 caractères")
  .max(128, "Le mot de passe ne doit pas dépasser 128 caractères")
  .refine(
    (password) => !COMMON_PASSWORDS.has(password.toLowerCase()),
    "Ce mot de passe est trop courant",
  );
