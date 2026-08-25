import { z } from "zod";

/**
 * Schéma pour mettre à jour le statut d'une commande
 */
export const commandeStatutSchema = z.object({
  statut: z.enum(["recue", "en_preparation", "prete", "servie", "annulee"]),
});

export type CommandeStatutInput = z.infer<typeof commandeStatutSchema>;
