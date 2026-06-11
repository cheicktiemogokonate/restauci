import type {
  Commande,
  Restaurant,
  Plat,
  Categorie,
  CreneauHoraire,
  StatutCommande,
} from "@/lib/db/types";

export interface MenuManagerProps {
  categories: Categorie[];
  creneaux: CreneauHoraire[];
  initialPlats: Plat[];
}

export interface CommandesPageClientProps {
  initialCommandes: Commande[];
  restaurantId: string;
}

export interface CommandeResume {
  id: string;
  numero: string;
  nomClient: string;
  total: number;
  statut: StatutCommande;
  createdAt: Date;
}

export interface RecentOrdersProps {
  commandes: CommandeResume[];
}

export interface StatsDashboard {
  commandesAujourdhui: number;
  commandesMois: number;
  chiffreAffairesMois: number;
  commandesEnCours: number;
  commandesEnPreparation: number;
  commandesPrêtes: number;
}

export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
}
