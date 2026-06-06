import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import {
  users,
  restaurants,
  categories,
  plats,
  commandes,
  creneauxHoraires,
  clients,
  paiements,
  livraisons,
  livreurs,
  promotions,
  avis,
  notifications,
  abonnements,
} from "./schema";

// ============================================================================
// SELECT TYPES  (ce que Drizzle retourne en lecture)
// ============================================================================

export type User           = InferSelectModel<typeof users>;
export type Restaurant     = InferSelectModel<typeof restaurants>;
export type Abonnement     = InferSelectModel<typeof abonnements>;
export type CreneauHoraire = InferSelectModel<typeof creneauxHoraires>;
export type Categorie      = InferSelectModel<typeof categories>;
export type Plat           = InferSelectModel<typeof plats>;
export type Client         = InferSelectModel<typeof clients>;
export type Commande       = InferSelectModel<typeof commandes>;
export type Paiement       = InferSelectModel<typeof paiements>;
export type Livraison      = InferSelectModel<typeof livraisons>;
export type Livreur        = InferSelectModel<typeof livreurs>;
export type Promotion      = InferSelectModel<typeof promotions>;
export type Avis           = InferSelectModel<typeof avis>;
export type Notification   = InferSelectModel<typeof notifications>;

// ============================================================================
// INSERT TYPES  (ce qu'on envoie en écriture)
// ============================================================================

export type NewUser           = InferInsertModel<typeof users>;
export type NewRestaurant     = InferInsertModel<typeof restaurants>;
export type NewAbonnement     = InferInsertModel<typeof abonnements>;
export type NewCreneauHoraire = InferInsertModel<typeof creneauxHoraires>;
export type NewCategorie      = InferInsertModel<typeof categories>;
export type NewPlat           = InferInsertModel<typeof plats>;
export type NewClient         = InferInsertModel<typeof clients>;
export type NewCommande       = InferInsertModel<typeof commandes>;
export type NewPaiement       = InferInsertModel<typeof paiements>;
export type NewLivraison      = InferInsertModel<typeof livraisons>;
export type NewLivreur        = InferInsertModel<typeof livreurs>;
export type NewPromotion      = InferInsertModel<typeof promotions>;
export type NewAvis           = InferInsertModel<typeof avis>;
export type NewNotification   = InferInsertModel<typeof notifications>;

// ============================================================================
// TYPES ENRICHIS  (avec relations)
// ============================================================================

export type RestaurantAvecRelations = Restaurant & {
  abonnement?: Abonnement | null;
  creneaux?: CreneauHoraire[];
  categories?: CategorieAvecPlats[];
  livreurs?: Livreur[];
};

export type CategorieAvecPlats = Categorie & {
  plats?: Plat[];
  creneau?: CreneauHoraire | null;
};

export type PlatAvecCategorie = Plat & {
  categorie?: Categorie | null;
  creneau?: CreneauHoraire | null;
  promotions?: Promotion[];
};

export type CommandeAvecRelations = Commande & {
  client?: Client | null;
  paiement?: Paiement | null;
  livraison?: LivraisonAvecLivreur | null;
  avis?: Avis | null;
};

export type LivraisonAvecLivreur = Livraison & {
  livreur?: Livreur | null;
};

export type AvisAvecClient = Avis & {
  client?: Client | null;
  commande?: Commande | null;
};

// ============================================================================
// TYPES UTILITAIRES
// ============================================================================

/** Enum helpers */
export type Role             = "restaurateur" | "admin";
export type ModeCommande     = "sur_place" | "livraison" | "emporter";
export type StatutCommande   = "recue" | "en_preparation" | "prete" | "servie" | "annulee";
export type StatutPaiement   = "en_attente" | "paye" | "rembourse" | "echoue";
export type MethodePaiement  = "especes" | "carte" | "mobile_money" | "en_ligne";
export type StatutLivraison  = "en_attente" | "assignee" | "en_route" | "livree" | "echouee";
export type TypePromotion    = "pourcentage" | "montant_fixe" | "offre_1_1" | "livraison_gratuite";
export type TypeNotification = "nouvelle_commande" | "commande_prete" | "commande_annulee" | "nouveau_avis" | "promotion" | "systeme";
export type PlanAbonnement   = "gratuit" | "starter" | "pro" | "entreprise";
export type StatutAbonnement = "essai" | "actif" | "expire" | "suspendu";

/** Nutrition d'un plat */
export type Nutrition = {
  calories: number;
  proteines: number;
  lipides: number;
  glucides: number;
};

/** Item dans le jsonb commandes.items */
export type CommandeItem = {
  platId: string;
  nom: string;
  prix: number;
  quantite: number;
  note?: string;
};

/** Résultat paginé générique */
export type PageResult<T> = {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
};

/** Stats dashboard */
export type StatsDashboard = {
  commandesAujourdhui: number;
  commandesSemaine: number;
  commandesMois: number;
  chiffreAffairesMois: number;
  commandesEnCours: { statut: StatutCommande; count: number }[];
};

/** Évolution commandes par jour */
export type CommandesParJour = {
  jour: string;
  count: number;
  total: number;
};

/** Statuts des commandes avec labels UI */
export const STATUT_COMMANDE_LABELS: Record<StatutCommande, string> = {
  recue:          "Reçue",
  en_preparation: "En préparation",
  prete:          "Prête",
  servie:         "Servie",
  annulee:        "Annulée",
};

export const STATUT_COMMANDE_COLORS: Record<StatutCommande, string> = {
  recue:          "bg-blue-100 text-blue-700",
  en_preparation: "bg-amber-100 text-amber-700",
  prete:          "bg-green-100 text-green-700",
  servie:         "bg-gray-100 text-gray-600",
  annulee:        "bg-red-100 text-red-600",
};

export const MODE_COMMANDE_LABELS: Record<ModeCommande, string> = {
  sur_place: "Sur place",
  livraison: "Livraison",
  emporter:  "À emporter",
};

export const PLAN_LABELS: Record<PlanAbonnement, string> = {
  gratuit:    "Gratuit",
  starter:    "Starter",
  pro:        "Pro",
  entreprise: "Entreprise",
};

export const PLAN_LIMITES: Record<PlanAbonnement, { maxPlats: number; maxCategories: number }> = {
  gratuit:    { maxPlats: 20,  maxCategories: 5  },
  starter:    { maxPlats: 50,  maxCategories: 10 },
  pro:        { maxPlats: 200, maxCategories: 30 },
  entreprise: { maxPlats: 999, maxCategories: 99 },
};