import type {
  Categorie,
  Commande,
  CreneauHoraire,
  PlatAvecCategorie,
  Restaurant,
} from "@/lib/db/types";

export type { PlatAvecCategorie };

// Props pour StatsCards
export interface StatsDashboard {
  commandesAujourdhui: number;
  commandesMois: number;
  chiffreAffairesMois: number; // en centimes
  commandesEnCours: number;
  commandesEnPreparation: number;
  commandesPrêtes: number;
}

export interface CommandeResume extends Omit<
  Commande,
  "client" | "paiement" | "livraison"
> {
  clientNom?: string;
  statutLabel: string;
  type?: string;
}

// Props pour RecentOrders
export interface RecentOrdersProps {
  commandes: CommandeResume[];
}

// Props pour MenuManager
export interface MenuManagerProps {
  restaurant: Restaurant;
  initialPlats: PlatAvecCategorie[];
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

// Résultat paginé générique
export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
}
