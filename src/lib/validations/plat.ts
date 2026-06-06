import { z } from "zod";

/**
 * Schéma de validation pour créer/mettre à jour un plat
 */
export const platSchema = z.object({
  nom: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  description: z.string().optional(),
  prix: z.number().int("Le prix doit être un entier").positive("Le prix doit être positif"),
  categorieId: z.string().uuid("ID de catégorie invalide"),
  image: z.string().url("URL d'image invalide").optional(),
  disponible: z.boolean().optional().default(true),
});

export type PlatInput = z.infer<typeof platSchema>;
