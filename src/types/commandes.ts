import type { StatutCommande, ModeCommande } from "@/lib/db/types";

export const STATUT_LABELS: Record<StatutCommande, string> = {
  recue:          "Reçue",
  en_preparation: "En préparation",
  prete:          "Prête",
  servie:         "Servie",
  annulee:        "Annulée",
};

export const STATUT_COLORS: Record<StatutCommande, string> = {
  recue:          "bg-blue-100 text-blue-700",
  en_preparation: "bg-amber-100 text-amber-700",
  prete:          "bg-green-100 text-green-700",
  servie:         "bg-gray-100 text-gray-600",
  annulee:        "bg-red-100 text-red-600",
};

export const MODE_LABELS: Record<ModeCommande, string> = {
  sur_place: "Sur place",
  livraison: "Livraison",
  emporter:  "À emporter",
};
