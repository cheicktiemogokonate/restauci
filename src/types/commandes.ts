import type { StatutCommande, ModeCommande, Commande } from "@/lib/db/types";

// Payload SSE pour un changement de statut (envoyé à l'app client)
export interface SseStatutPayload {
  statut: StatutCommande;
  commandeId: string;
  timestamp: string;
  lienId?: string;
  numero?: string;
  total?: number;
}

// Payload SSE pour une notification push (titre/message, ex: commande_prete)
export interface SseNotificationPayload {
  titre: string;
  message: string;
  lienId?: string;
  lienType?: string;
}

export interface SseDriverAssignmentPayload {
  commandeId: string;
  livreurId: string;
}

// Map exhaustive des types d'événements SSE et leur payload.
// Utilisée par le hook useCommandesStream et le consommateur.
export interface SseEventMap {
  nouvelle_commande: Commande;
  statut: SseStatutPayload;
  livreur_assigne: SseDriverAssignmentPayload;
  commande_prete: SseNotificationPayload;
  commande_annulee: SseNotificationPayload;
  nouveau_avis: SseNotificationPayload;
  promotion: SseNotificationPayload;
  systeme: SseNotificationPayload;
  message: unknown;
}

// Type union de tous les événements SSE, discriminated par `type`.
export type SseEvent =
  { [K in keyof SseEventMap]: { type: K; data: SseEventMap[K] } }[keyof SseEventMap];

// Labels affichés dans l'UI
export const STATUT_LABELS: Record<StatutCommande, string> = {
  recue:           "Reçue",
  en_preparation:  "En préparation",
  prete:           "Prête",
  servie:          "Servie",
  annulee:         "Annulée",
};

// Classes CSS Tailwind par statut
export const STATUT_COLORS: Record<StatutCommande, string> = {
  recue:           "bg-blue-100 text-blue-700",
  en_preparation:  "bg-amber-100 text-amber-700",
  prete:           "bg-green-100 text-green-700",
  servie:          "bg-gray-100 text-gray-600",
  annulee:         "bg-red-100 text-red-600",
};

export const MODE_LABELS: Record<ModeCommande, string> = {
  sur_place:  "Sur place",
  livraison:  "Livraison",
  emporter:   "À emporter",
};

// Source unique de vérité pour les transitions de statut.
// `prete` peut aller vers `annulee` : une commande prête mais non réclamée
// peut légitimement être annulée (erreur client, doublon, etc.).
export const STATUT_TRANSITIONS: Record<StatutCommande, StatutCommande[]> = {
  recue: ["en_preparation", "annulee"],
  en_preparation: ["prete", "annulee"],
  prete: ["servie", "annulee"],
  servie: [],
  annulee: [],
};

// Forme inverse utilisée par la mutation atomique côté serveur. Garder les
// deux tables ici évite que l'UI et l'API divergent sur le workflow métier.
export const STATUT_PREVIOUS_STATUSES: Record<StatutCommande, StatutCommande[]> = {
  recue: [],
  en_preparation: ["recue"],
  prete: ["en_preparation"],
  servie: ["prete"],
  annulee: ["recue", "en_preparation", "prete"],
};

export function canRestaurateurSetCommandeStatus(
  modeCommande: ModeCommande,
  statut: StatutCommande,
) {
  return !(modeCommande === "livraison" && statut === "servie");
}
