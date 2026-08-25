import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import {
  users,
  restaurants,
  categories,
  plats,
  commandes,
  creneauxHoraires,
  clients,
  financialTransactions,
  payments,
  livraisons,
  livreurs,
  promotions,
  avis,
  notifications,
  partnerAccounts,
  subscriptionPlans,
  subscriptionRequests,
  subscriptionPeriods,
  subscriptionPlanLimits,
  subscriptionPeriodLimits,
  commissionSettlements,
  typeNotificationEnum,
} from "./schema";

// ============================================================================
// SELECT TYPES  (ce que Drizzle retourne en lecture)
// ============================================================================

export type User           = InferSelectModel<typeof users>;
export type Restaurant     = InferSelectModel<typeof restaurants>;
export type PartnerAccount = InferSelectModel<typeof partnerAccounts>;
export type CreneauHoraire = InferSelectModel<typeof creneauxHoraires>;
export type Categorie      = InferSelectModel<typeof categories>;
export type Plat           = InferSelectModel<typeof plats>;
export type Client         = InferSelectModel<typeof clients>;
export type Commande       = InferSelectModel<typeof commandes>;
export type FinancialTransaction = InferSelectModel<typeof financialTransactions>;
export type Payment         = InferSelectModel<typeof payments>;
export type Livraison      = InferSelectModel<typeof livraisons>;
export type Livreur        = InferSelectModel<typeof livreurs>;
export type Promotion      = InferSelectModel<typeof promotions>;
export type Avis           = InferSelectModel<typeof avis>;
export type Notification   = InferSelectModel<typeof notifications>;
export type SubscriptionPlan = InferSelectModel<typeof subscriptionPlans>;
export type SubscriptionRequest = InferSelectModel<typeof subscriptionRequests>;
export type SubscriptionPeriod = InferSelectModel<typeof subscriptionPeriods>;
export type SubscriptionPlanLimit = InferSelectModel<typeof subscriptionPlanLimits>;
export type SubscriptionPeriodLimit = InferSelectModel<typeof subscriptionPeriodLimits>;
export type CommissionSettlement = InferSelectModel<typeof commissionSettlements>;

// ============================================================================
// INSERT TYPES  (ce qu'on envoie en écriture)
// ============================================================================

export type NewUser           = InferInsertModel<typeof users>;
export type NewRestaurant     = InferInsertModel<typeof restaurants>;
export type NewPartnerAccount = InferInsertModel<typeof partnerAccounts>;
export type NewCreneauHoraire = InferInsertModel<typeof creneauxHoraires>;
export type NewCategorie      = InferInsertModel<typeof categories>;
export type NewPlat           = InferInsertModel<typeof plats>;
export type NewClient         = InferInsertModel<typeof clients>;
export type NewCommande       = InferInsertModel<typeof commandes>;
export type NewFinancialTransaction = InferInsertModel<typeof financialTransactions>;
export type NewPayment       = InferInsertModel<typeof payments>;
export type NewLivraison      = InferInsertModel<typeof livraisons>;
export type NewLivreur        = InferInsertModel<typeof livreurs>;
export type NewPromotion      = InferInsertModel<typeof promotions>;
export type NewAvis           = InferInsertModel<typeof avis>;
export type NewNotification   = InferInsertModel<typeof notifications>;
export type NewSubscriptionPlan = InferInsertModel<typeof subscriptionPlans>;
export type NewSubscriptionRequest = InferInsertModel<typeof subscriptionRequests>;
export type NewSubscriptionPeriod = InferInsertModel<typeof subscriptionPeriods>;
export type NewSubscriptionPlanLimit = InferInsertModel<typeof subscriptionPlanLimits>;
export type NewSubscriptionPeriodLimit = InferInsertModel<typeof subscriptionPeriodLimits>;
export type NewCommissionSettlement = InferInsertModel<typeof commissionSettlements>;

// ============================================================================
// TYPES ENRICHIS  (avec relations)
// ============================================================================

export type RestaurantAvecRelations = Restaurant & {
  partnerAccount?: PartnerAccount | null;
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
  financialTransaction?: (FinancialTransaction & { payments?: Payment[] }) | null;
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
export type Role             = "partner" | "admin";
export type ActivityType     = "restaurant" | "residence";
export type ModeCommande     = "sur_place" | "livraison" | "emporter";
export type StatutCommande   = "en_attente_paiement" | "recue" | "en_preparation" | "prete" | "servie" | "annulee";
export type TransactionStatus = "pending" | "paid" | "cancelled";
export type PaymentStatus = "pending" | "confirmed" | "failed" | "cancelled";
export type PaymentMethod = "cash" | "mobile_money" | "card" | "bank_transfer" | "cheque" | "manual";
export type StatutLivraison  = "en_attente" | "assignee" | "en_route" | "livree" | "echouee";
export type TypePromotion    = "pourcentage" | "montant_fixe" | "offre_1_1" | "livraison_gratuite";
export type TypeNotification = (typeof typeNotificationEnum.enumValues)[number];
export type PlanCode         = "decouverte" | "croissance" | "partenaire_fier";
export type StatutDemandeAbonnement = "en_attente" | "validee" | "refusee" | "annulee";
export type StatutPeriodeAbonnement = "active" | "expiree" | "terminee" | "suspendue" | "annulee";
export type MoyenReglement   = "mobile_money" | "carte" | "virement" | "especes" | "cheque";
export type QuotaResourceType = "category" | "dish" | "residence";

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

export const STATUT_COMMANDE_COLORS: Record<StatutCommande, string> = {
  en_attente_paiement: "bg-amber-100 text-amber-700",
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
