import type { Commande } from "@/lib/db/types";

/**
 * Construit le payload SSE normalisé pour un événement `nouvelle_commande`.
 *
 * Source unique de vérité pour la forme des données poussées vers le
 * dashboard restaurateur via la queue Redis `restauci:sse:queue:<restaurantId>`.
 * Tous les chemins de création de commande (API POST, createCommande)
 * doivent passer par ici pour garantir un contrat cohérent côté consommateur.
 *
 * Les `Date` sont sérialisées en ISO strings — le client les repasse via
 * `new Date(...)` comme pour les commandes chargées côté serveur.
 */
export function buildNouvelleCommandePayload(commande: Commande): Record<string, unknown> {
  return {
    id: commande.id,
    numero: commande.numero,
    restaurantId: commande.restaurantId,
    statut: commande.statut,
    modeCommande: commande.modeCommande,
    numeroTable: commande.numeroTable,
    nomClient: commande.nomClient,
    telephoneClient: commande.telephoneClient,
    adresseLivraison: commande.adresseLivraison,
    latitudeLivraison: commande.latitudeLivraison,
    longitudeLivraison: commande.longitudeLivraison,
    distanceKm: commande.distanceKm,
    items: commande.items,
    sousTotal: commande.sousTotal,
    fraisLivraison: commande.fraisLivraison,
    remise: commande.remise,
    total: commande.total,
    noteClient: commande.noteClient,
    noteInterne: commande.noteInterne,
    tempsPreparationEstime: commande.tempsPreparationEstime,
    heureAcceptee:
      commande.heureAcceptee instanceof Date
        ? commande.heureAcceptee.toISOString()
        : commande.heureAcceptee,
    heurePrete:
      commande.heurePrete instanceof Date
        ? commande.heurePrete.toISOString()
        : commande.heurePrete,
    heureServie:
      commande.heureServie instanceof Date
        ? commande.heureServie.toISOString()
        : commande.heureServie,
    createdAt:
      commande.createdAt instanceof Date
        ? commande.createdAt.toISOString()
        : commande.createdAt,
    updatedAt:
      commande.updatedAt instanceof Date
        ? commande.updatedAt.toISOString()
        : commande.updatedAt,
  };
}
