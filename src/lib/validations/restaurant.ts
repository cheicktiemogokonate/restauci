import { z } from "zod";

/**
 * Schéma de validation pour créer/mettre à jour un restaurant
 */
export const restaurantSchema = z.object({
  nom: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  description: z.string().optional(),
  adresse: z.string().min(5, "L'adresse doit être valide"),
  telephone: z.string().min(10, "Le téléphone doit être valide"),
  latitude: z.number().min(-90).max(90, "Latitude invalide"),
  longitude: z.number().min(-180).max(180, "Longitude invalide"),
  fraisLivraison: z.number().int("Les frais doivent être un entier").nonnegative("Les frais doivent être positifs ou nuls"),
  modesCommande: z.array(z.enum(["sur_place", "livraison", "emporter"])).min(1, "Au moins un mode de commande requis"),
  logoUrl: z.string().url("URL du logo invalide").optional(),
  actif: z.boolean().optional().default(false),
});

export type RestaurantInput = z.infer<typeof restaurantSchema>;
