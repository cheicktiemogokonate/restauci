import { emailSchema } from "@/shared/security";
import { z } from "zod";

export const adminAccountIdSchema = z.string().uuid();

export const adminAccountConfirmationSchema = z
  .string()
  .min(1, "Votre mot de passe est requis.")
  .max(128);

export const createAdminAccountSchema = z
  .object({
    email: emailSchema,
    nom: z.string().trim().min(2).max(120),
    telephone: z
      .string()
      .trim()
      .min(8)
      .max(20)
      .regex(/^\+?[0-9 ]+$/, "Numéro de téléphone invalide."),
    actorPassword: adminAccountConfirmationSchema,
  })
  .strict();

export const suspendAdminAccountSchema = z
  .object({
    adminId: adminAccountIdSchema,
    motif: z.string().trim().min(5).max(500),
  })
  .strict();

export const resetAdminPasswordSchema = z
  .object({
    adminId: adminAccountIdSchema,
    actorPassword: adminAccountConfirmationSchema,
  })
  .strict();

export type CreateAdminAccountCommand = z.infer<
  typeof createAdminAccountSchema
>;
