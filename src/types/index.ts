// Re-exports centralisés — évite de dupliquer les types Drizzle
export type {
  User,
  NewUser,
  Restaurant,
  NewRestaurant,
  CreneauHoraire,
  NewCreneauHoraire,
  Categorie,
  NewCategorie,
  Plat,
  NewPlat,
  Client,
  NewClient,
  Commande,
  NewCommande,
  PageResult,
  StatsDashboard,
  CommandeItem,
  StatutCommande,
  ModeCommande,
  Role,
} from "@/lib/db/types";

// Types métier spécifiques à l'UI (non présents dans lib/db/types)

export interface Coordonnees {
  latitude: number;
  longitude: number;
}

export interface PanierItem {
  platId: string;
  nom: string;
  prix: number;
  quantite: number;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: "restaurateur" | "admin";
  nom?: string;
  avatarUrl?: string;
}
