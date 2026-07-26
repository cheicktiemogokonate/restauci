import type { StatutCommande } from "@/lib/db/types";

export const COMMANDE_STATUS_META: Record<
  StatutCommande,
  { label: string; className: string }
> = {
  recue: {
    label: "Reçue",
    className: "bg-amber-50 text-amber-700 border border-amber-100",
  },
  en_preparation: {
    label: "En préparation",
    className: "bg-blue-50 text-blue-700 border border-blue-100",
  },
  prete: {
    label: "Prête",
    className: "bg-violet-50 text-violet-700 border border-violet-100",
  },
  servie: {
    label: "Servie",
    className: "bg-emerald-50 text-emerald-700 border border-emerald-100",
  },
  annulee: {
    label: "Annulée",
    className: "bg-red-50 text-red-700 border border-red-100",
  },
};

export function getCommandeStatusMeta(statut: string) {
  return COMMANDE_STATUS_META[statut as StatutCommande] ?? {
    label: statut,
    className: "bg-gray-100 text-gray-600 border border-gray-200",
  };
}
