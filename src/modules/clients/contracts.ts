import { z } from "zod";
import { emailSchema, strongPasswordSchema } from "@/shared/security";

export const clientPhoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9\s]{8,20}$/, "Numéro de téléphone invalide");

export const registerClientSchema = z
  .object({
    nom: z.string().trim().min(2, "Nom trop court").max(255),
    telephone: clientPhoneSchema,
    email: emailSchema.optional(),
    password: strongPasswordSchema,
  })
  .strict();

export const authenticateClientSchema = z
  .object({
    telephone: clientPhoneSchema,
    password: z.string().min(1).max(128),
  })
  .strict();

export const updateClientProfileSchema = z
  .object({
    nom: z.string().trim().min(2).max(255).optional(),
    email: emailSchema.optional().nullable(),
    adresseDefaut: z.string().trim().max(500).optional().nullable(),
    latitudeDefaut: z.number().finite().min(-90).max(90).optional().nullable(),
    longitudeDefaut: z.number().finite().min(-180).max(180).optional().nullable(),
    ancienPassword: z.string().max(128).optional(),
    nouveauPassword: strongPasswordSchema.optional(),
  })
  .strict()
  .refine((value) => !(value.nouveauPassword && !value.ancienPassword), {
    message: "L'ancien mot de passe est requis",
    path: ["ancienPassword"],
  })
  .refine(
    (value) =>
      (value.latitudeDefaut === null && value.longitudeDefaut === null) ||
      (value.latitudeDefaut === undefined && value.longitudeDefaut === undefined) ||
      (typeof value.latitudeDefaut === "number" &&
        typeof value.longitudeDefaut === "number"),
    {
      message: "La latitude et la longitude doivent être renseignées ensemble.",
      path: ["latitudeDefaut"],
    },
  );

export const listAdminClientsSchema = z
  .object({
    search: z.string().trim().max(100).optional(),
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20),
  })
  .strict();

export interface ClientSessionStateDTO {
  id: string;
  active: boolean;
}

export interface ClientProfileDTO {
  id: string;
  nom: string;
  telephone: string;
  email: string | null;
  adresseDefaut: string | null;
  latitudeDefaut: number | null;
  longitudeDefaut: number | null;
  nombreCommandes: number;
  totalDepense: number;
  createdAt: Date;
}

export interface AdminClientDTO extends ClientProfileDTO {
  actif: boolean;
}

export type RegisterClientCommand = z.infer<typeof registerClientSchema>;
export type AuthenticateClientCommand = z.infer<typeof authenticateClientSchema>;
export type UpdateClientProfileCommand = z.infer<typeof updateClientProfileSchema>;
export type ListAdminClientsInput = z.input<typeof listAdminClientsSchema>;
