import type { Commande, Categorie, CreneauHoraire, Plat, Restaurant } from "@/lib/db/types";

// Props pour StatsCards (déjà défini dans lib/db/types.ts mais réexporté ici)
export interface StatsDashboardProps {
  commandesAujourdhui: number;
  commandesMois: number;
  chiffreAffairesMois: number;   // en centimes
  commandesEnCours: number;
  commandesEnPreparation: number;
  commandesPrêtes: number;
}

// Props pour RecentOrders
export interface RecentOrdersProps {
  commandes: CommandeResume[];
}

interface CommandeResume extends Omit<Commande, "client" | "paiement" | "livraison"> {
  clientNom?: string;
  statutLabel: string;
}

// Props pour MenuManager
export interface MenuManagerProps {
  restaurant: Restaurant;
  initialPlats: (Plat & { categorie?: Categorie })[];
  categories: Categorie[];
  creneaux: CreneauHoraire[];
  totalPlats: number;
}

// Props pour CommandesPageClient
export interface CommandesPageClientProps {
  restaurant: Restaurant;
  initialCommandes: Commande[];
  counts: Record<string, number>;
  total: number;
}

// Résultat paginé générique (déjà dans lib/db/types.ts)
export type PageResult<T> = {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
};
