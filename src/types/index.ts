import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import {
  users,
  restaurants,
  creneauxHoraires,
  categories,
  plats,
  clients,
  commandes,
} from "@/lib/db/schema";

// ============================================================================
// INFERRED TYPES FROM DATABASE SCHEMA
// ============================================================================

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

export type Restaurant = InferSelectModel<typeof restaurants>;
export type NewRestaurant = InferInsertModel<typeof restaurants>;

export type CreneauHoraire = InferSelectModel<typeof creneauxHoraires>;
export type NewCreneauHoraire = InferInsertModel<typeof creneauxHoraires>;

export type Categorie = InferSelectModel<typeof categories>;
export type NewCategorie = InferInsertModel<typeof categories>;

export type Plat = InferSelectModel<typeof plats>;
export type NewPlat = InferInsertModel<typeof plats>;

export type Client = InferSelectModel<typeof clients>;
export type NewClient = InferInsertModel<typeof clients>;

export type Commande = InferSelectModel<typeof commandes>;
export type NewCommande = InferInsertModel<typeof commandes>;

// ============================================================================
// CUSTOM BUSINESS TYPES
// ============================================================================

/**
 * Élément d'une commande avec id du plat, nom, prix et quantité
 */
export interface CommandeItem {
  platId: string;
  nom: string;
  prix: number;
  quantite: number;
}

/**
 * Coordonnées GPS (latitude, longitude)
 */
export interface Coordonnees {
  latitude: number;
  longitude: number;
}

/**
 * Résultat du calcul de distance entre deux points
 */
export interface DistanceResult {
  distanceKm: number;
  distanceLabel: string;
}

/**
 * Élément du panier avec plat et quantité
 */
export interface PanierItem {
  plat: Plat;
  quantite: number;
}

/**
 * Panier avec article(s) pour un restaurant
 */
export interface Panier {
  restaurantId: string;
  items: PanierItem[];
  sousTotal: number;
  fraisLivraison: number;
  total: number;
}

/**
 * Menu complet d'un restaurant avec créneaux, catégories et plats
 */
export interface MenuComplet extends Restaurant {
  creneaux: CreneauHoraire[];
  categories: (Categorie & { plats: Plat[] })[];
}

/**
 * Réponse de création/mise à jour de restaurant
 */
export interface RestaurantResponse {
  success: boolean;
  message: string;
  restaurant?: Restaurant;
  errors?: Record<string, string[]>;
}

/**
 * Réponse de création de commande
 */
export interface CommandeResponse {
  success: boolean;
  message: string;
  commande?: Commande;
  errors?: Record<string, string[]>;
}

/**
 * Pagination helper
 */
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

/**
 * Réponse paginée générique
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

/**
 * Utilisateur avec son restaurant (si existe)
 */
export interface UserWithRestaurant extends User {
  restaurant?: Restaurant | null;
}

/**
 * Restaurant avec ses détails complets (creneaux, catégories, plats)
 */
export interface RestaurantWithDetails extends Restaurant {
  user: User;
  creneaux: CreneauHoraire[];
  categories: (Categorie & { plats: Plat[] })[];
  commandes?: Commande[];
}

/**
 * Commande avec détails client et restaurant
 */
export interface CommandeWithDetails extends Commande {
  restaurant: Restaurant;
  client: Client | null;
}

/**
 * Contexte d'authentification JWT
 */
export interface JWTPayload {
  userId: string;
  email: string;
  role: "restaurateur" | "admin";
}

/**
 * Erreur d'API structurée
 */
export interface APIError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Statistiques de restaurant
 */
export interface RestaurantStats {
  totalCommandes: number;
  totalRevenue: number;
  commandesAujourdhui: number;
  revenueAujourdhui: number;
  platosMostOrdered: (Plat & { orderCount: number })[];
  statusBreakdown: Record<string, number>;
}
