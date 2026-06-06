import { z } from "zod";

/**
 * Schéma de validation pour les éléments d'une commande
 */
export const commandeItemSchema = z.object({
  platId: z.string().uuid("ID du plat invalide"),
  nom: z.string().min(1, "Nom du plat requis"),
  prix: z.number().positive("Prix doit être positif"),
  quantite: z.number().int("Quantité doit être un entier").positive("Quantité doit être positive"),
});

export type CommandeItemInput = z.infer<typeof commandeItemSchema>;

/**
 * Schéma de validation pour créer/mettre à jour une commande
 * Validation conditionnelle : telephoneClient requis si livraison, numeroTable si sur_place
 */
export const commandeSchema = z.object({
  restaurantId: z.string().uuid("ID du restaurant invalide"),
  modeCommande: z.enum(["sur_place", "livraison", "emporter"]),
  nomClient: z.string().min(1, "Le nom du client est requis"),
  telephoneClient: z.string().optional(),
  numeroTable: z.string().min(1, "Le numéro de table est requis").optional(),
  adresseLivraison: z.string().optional(),
  latitudeLivraison: z.number().optional(),
  longitudeLivraison: z.number().optional(),
  noteClient: z.string().optional(),
  items: z.array(commandeItemSchema).min(1, "Au moins un élément requis"),
}).refine(
  (data) => {
    if (data.modeCommande === "livraison" && !data.telephoneClient?.trim()) {
      return false;
    }
    return true;
  },
  {
    message: "Le téléphone du client est requis pour une livraison",
    path: ["telephoneClient"],
  }
).refine(
  (data) => {
    if (data.modeCommande === "sur_place" && !data.numeroTable?.trim()) {
      return false;
    }
    return true;
  },
  {
    message: "Le numéro de table est requis pour une commande sur place",
    path: ["numeroTable"],
  }
);

export type CommandeInput = z.infer<typeof commandeSchema>;

/**
 * Schéma pour mettre à jour le statut d'une commande
 */
export const commandeStatutSchema = z.object({
  statut: z.enum(["recue", "en_preparation", "prete", "servie", "annulee"]),
});

export type CommandeStatutInput = z.infer<typeof commandeStatutSchema>;
