import type { StatutCommande, ModeCommande } from "@/lib/db/types";

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

export const STATUT_TRANSITIONS: Record<StatutCommande, StatutCommande[]> = {
  recue: ["en_preparation", "annulee"],
  en_preparation: ["prete", "annulee"],
  prete: ["servie"],
  servie: [],
  annulee: [],
};
