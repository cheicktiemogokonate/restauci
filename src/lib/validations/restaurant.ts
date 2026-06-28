import { z } from "zod";

export const restaurantSchema = z.object({
  nom: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  description: z.string().optional(),
  adresse: z.string().min(5, "L'adresse doit être valide"),
  telephone: z.string().min(10, "Le téléphone doit être valide"),
  latitude: z.number().min(-90).max(90, "Latitude invalide"),
  longitude: z.number().min(-180).max(180, "Longitude invalide"),
  fraisLivraison: z.number().int().nonnegative().optional().default(0),
  commandeMinimum: z.number().int().nonnegative().optional().default(0),
  modesCommande: z
    .array(z.enum(["sur_place", "livraison", "emporter"]))
    .min(1, "Au moins un mode de commande requis"),
  cuisines: z.array(z.string()).optional().default([]),
  logoUrl: z.string().url("URL du logo invalide").optional(),
  banniereUrl: z.string().url().optional(),
  facebook: z.string().optional().or(z.literal("")),
  instagram: z.string().optional().or(z.literal("")),
  whatsapp: z.string().optional().or(z.literal("")),
  pays: z.string().optional(),
  ville: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  siteWeb: z.string().url().optional().or(z.literal("")),
  actif: z.boolean().optional().default(false),
  enLigne: z.boolean().optional().default(false),
  accepteCommandes: z.boolean().optional().default(true),
  tempsPreparationMoyen: z.number().int().nonnegative().optional().default(20),
});

export const restaurantUpdateSchema = restaurantSchema.omit({ actif: true }).partial();

export type RestaurantInput = z.infer<typeof restaurantSchema>;
