import {
  pgTable,
  pgEnum,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  doublePrecision,
  real,
  time,
  varchar,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================================================
// ENUMS
// ============================================================================

export const roleEnum = pgEnum("role", [
  "restaurateur",
  "admin",
]);

export const modeCommandeEnum = pgEnum("mode_commande", [
  "sur_place",
  "livraison",
  "emporter",
]);

export const statutCommandeEnum = pgEnum("statut_commande", [
  "recue",
  "en_preparation",
  "prete",
  "servie",
  "annulee",
]);

export const statutPaiementEnum = pgEnum("statut_paiement", [
  "en_attente",
  "paye",
  "rembourse",
  "echoue",
]);

export const methodePaiementEnum = pgEnum("methode_paiement", [
  "especes",
  "carte",
  "mobile_money",
  "en_ligne",
]);

export const statutLivraisonEnum = pgEnum("statut_livraison", [
  "en_attente",
  "assignee",
  "en_route",
  "livree",
  "echouee",
]);

export const typePromotionEnum = pgEnum("type_promotion", [
  "pourcentage",    // -10%
  "montant_fixe",   // -500 FCFA
  "offre_1_1",      // 1 acheté = 1 offert
  "livraison_gratuite",
]);

export const typeNotificationEnum = pgEnum("type_notification", [
  "nouvelle_commande",
  "commande_prete",
  "commande_annulee",
  "nouveau_avis",
  "promotion",
  "systeme",
]);

export const statutAbonnementEnum = pgEnum("statut_abonnement", [
  "essai",
  "actif",
  "expire",
  "suspendu",
]);

export const planAbonnementEnum = pgEnum("plan_abonnement", [
  "gratuit",
  "starter",
  "pro",
  "entreprise",
]);

// ============================================================================
// USERS  (restaurateurs & admins)
// ============================================================================

export const users = pgTable(
  "users",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    email: varchar("email", { length: 255 }).notNull().unique(),
    password: text("password").notNull(),
    role: roleEnum("role").notNull().default("restaurateur"),
    nom: varchar("nom", { length: 255 }).notNull(),
    telephone: varchar("telephone", { length: 20 }).notNull(),
    avatarUrl: text("avatar_url"),
    // Sécurité / session
    emailVerifie: boolean("email_verifie").notNull().default(false),
    tokenVerifEmail: text("token_verif_email"),
    tokenResetPassword: text("token_reset_password"),
    tokenResetExpireAt: timestamp("token_reset_expire_at", { withTimezone: true }),
    dernierConnexion: timestamp("dernier_connexion", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    emailIdx: uniqueIndex("idx_users_email").on(table.email),
  })
);

// ============================================================================
// RESTAURANTS
// ============================================================================

export const restaurants = pgTable(
  "restaurants",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    nom: varchar("nom", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    description: text("description"),
    telephone: varchar("telephone", { length: 20 }).notNull(),
    email: varchar("email", { length: 255 }),
    siteWeb: text("site_web"),
    adresse: text("adresse").notNull(),
    ville: varchar("ville", { length: 100 }),
    pays: varchar("pays", { length: 100 }).default("Côte d'Ivoire"),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    logoUrl: text("logo_url"),
    banniereUrl: text("banniere_url"),
    // Finances (montants en centimes / FCFA entiers)
    fraisLivraison: integer("frais_livraison").notNull().default(0),
    commandeMinimum: integer("commande_minimum").notNull().default(0),
    // Modes & config
    modesCommande: text("modes_commande")
      .array()
      .notNull()
      .default(["sur_place"]),
    cuisines: text("cuisines").array().default([]),  // ["Africaine","Pizza"]
    // Statuts
    actif: boolean("actif").notNull().default(false),
    enLigne: boolean("en_ligne").notNull().default(false),
    accepteCommandes: boolean("accepte_commandes").notNull().default(true),
    tempsPreparationMoyen: integer("temps_preparation_moyen").default(20), // minutes
    // Réseaux sociaux
    facebook: text("facebook"),
    instagram: text("instagram"),
    whatsapp: text("whatsapp"),
    // Statistiques dénormalisées (mise à jour via trigger ou job)
    nombreCommandes: integer("nombre_commandes").notNull().default(0),
    noteMoyenne: real("note_moyenne").default(0),
    nombreAvis: integer("nombre_avis").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    slugIdx:   uniqueIndex("idx_restaurants_slug").on(table.slug),
    userIdIdx: uniqueIndex("idx_restaurants_user_id").on(table.userId),
    villeIdx:  index("idx_restaurants_ville").on(table.ville),
  })
);

// ============================================================================
// ABONNEMENTS  (plan du restaurant)
// ============================================================================

export const abonnements = pgTable("abonnements", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  restaurantId: varchar("restaurant_id", { length: 36 })
    .notNull()
    .unique()
    .references(() => restaurants.id, { onDelete: "cascade" }),
  plan: planAbonnementEnum("plan").notNull().default("gratuit"),
  statut: statutAbonnementEnum("statut").notNull().default("essai"),
  dateDebut: timestamp("date_debut", { withTimezone: true })
    .notNull()
    .$defaultFn(() => new Date()),
  dateFin: timestamp("date_fin", { withTimezone: true }),
  // Limites du plan
  maxPlats: integer("max_plats").notNull().default(20),
  maxCategories: integer("max_categories").notNull().default(5),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ============================================================================
// CRENEAUX HORAIRES
// ============================================================================

export const creneauxHoraires = pgTable("creneaux_horaires", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  restaurantId: varchar("restaurant_id", { length: 36 })
    .notNull()
    .references(() => restaurants.id, { onDelete: "cascade" }),
  nom: varchar("nom", { length: 255 }).notNull(),   // "Déjeuner", "Dîner"
  heureOuverture: time("heure_ouverture", { precision: 0 }).notNull(),
  heureFermeture: time("heure_fermeture", { precision: 0 }).notNull(),
  joursActifs: text("jours_actifs").array().notNull(), // ["lundi","mardi"]
  actif: boolean("actif").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ============================================================================
// CATEGORIES DE MENU
// ============================================================================

export const categories = pgTable(
  "categories",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    restaurantId: varchar("restaurant_id", { length: 36 })
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    creneauId: varchar("creneau_id", { length: 36 }).references(
      () => creneauxHoraires.id,
      { onDelete: "set null" }
    ),
    nom: varchar("nom", { length: 255 }).notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    ordre: integer("ordre").notNull().default(0),
    visible: boolean("visible").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    restaurantOrdreIdx: index("idx_categories_restaurant_ordre").on(
      table.restaurantId,
      table.ordre
    ),
  })
);

// ============================================================================
// PLATS
// ============================================================================

export const plats = pgTable(
  "plats",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    restaurantId: varchar("restaurant_id", { length: 36 })
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    categorieId: varchar("categorie_id", { length: 36 })
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    creneauId: varchar("creneau_id", { length: 36 }).references(
      () => creneauxHoraires.id,
      { onDelete: "set null" }
    ),
    nom: varchar("nom", { length: 255 }).notNull(),
    description: text("description"),
    // Prix en centimes (FCFA entiers ou centimes EUR)
    prix: integer("prix").notNull(),
    photoUrl: text("photo_url"),
    disponible: boolean("disponible").notNull().default(true),
    ordre: integer("ordre").notNull().default(0),
    // Métadonnées
    tags: text("tags").array().default([]),
    allergenes: text("allergenes").array().default([]),
    nutrition: jsonb("nutrition").$type<{
      calories: number;
      proteines: number;
      lipides: number;
      glucides: number;
    }>(),
    // Statistiques
    nombreCommandes: integer("nombre_commandes").notNull().default(0),
    noteMoyenne: real("note_moyenne").default(0),
    nombreAvis: integer("nombre_avis").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    restaurantCatIdx: index("idx_plats_restaurant_categorie").on(
      table.restaurantId,
      table.categorieId
    ),
    disponibleIdx: index("idx_plats_disponible").on(table.disponible),
  })
);

// ============================================================================
// CLIENTS
// ============================================================================

export const clients = pgTable(
  "clients",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    nom: varchar("nom", { length: 255 }).notNull(),
    telephone: varchar("telephone", { length: 20 }).notNull().unique(),
    email: varchar("email", { length: 255 }).unique(),
    password: text("password"),
    avatarUrl: text("avatar_url"),
    // Adresse par défaut
    adresseDefaut: text("adresse_defaut"),
    latitudeDefaut: doublePrecision("latitude_defaut"),
    longitudeDefaut: doublePrecision("longitude_defaut"),
    // Fidélité
    nombreCommandes: integer("nombre_commandes").notNull().default(0),
    totalDepense: integer("total_depense").notNull().default(0), // centimes
    // Auth
    emailVerifie: boolean("email_verifie").notNull().default(false),
    actif: boolean("actif").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    telephoneIdx: uniqueIndex("idx_clients_telephone").on(table.telephone),
    emailIdx:     index("idx_clients_email").on(table.email),
  })
);

// ============================================================================
// COMMANDES
// ============================================================================

export const commandes = pgTable(
  "commandes",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    numero: varchar("numero", { length: 20 }).notNull().unique(),
    restaurantId: varchar("restaurant_id", { length: 36 })
      .notNull()
      .references(() => restaurants.id, { onDelete: "no action" }),
    clientId: varchar("client_id", { length: 36 }).references(
      () => clients.id,
      { onDelete: "no action" }
    ),
    modeCommande: modeCommandeEnum("mode_commande").notNull(),
    statut: statutCommandeEnum("statut").notNull().default("recue"),
    // Sur place
    numeroTable: varchar("numero_table", { length: 10 }),
    // Infos client (dénormalisées pour historique)
    nomClient: varchar("nom_client", { length: 255 }).notNull(),
    telephoneClient: varchar("telephone_client", { length: 20 }),
    // Livraison
    adresseLivraison: text("adresse_livraison"),
    latitudeLivraison: doublePrecision("latitude_livraison"),
    longitudeLivraison: doublePrecision("longitude_livraison"),
    distanceKm: real("distance_km"),
    // Articles (snapshot au moment de la commande)
    items: jsonb("items").notNull().$type<CommandeItemDB[]>(),
    // Montants (centimes)
    sousTotal: integer("sous_total").notNull(),
    fraisLivraison: integer("frais_livraison").notNull().default(0),
    remise: integer("remise").notNull().default(0),
    total: integer("total").notNull(),
    // Notes
    noteClient: text("note_client"),
    noteInterne: text("note_interne"),
    // Timing
    tempsPreparationEstime: integer("temps_preparation_estime"), // minutes
    heureAcceptee: timestamp("heure_acceptee", { withTimezone: true }),
    heurePrete: timestamp("heure_prete", { withTimezone: true }),
    heureServie: timestamp("heure_servie", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    numeroIdx:      uniqueIndex("idx_commandes_numero").on(table.numero),
    restaurantIdx:  index("idx_commandes_restaurant").on(table.restaurantId),
    clientIdx:      index("idx_commandes_client").on(table.clientId),
    statutIdx:      index("idx_commandes_statut").on(table.statut),
    createdAtIdx:   index("idx_commandes_created_at").on(table.createdAt),
  })
);

// ============================================================================
// PAIEMENTS
// ============================================================================

export const paiements = pgTable(
  "paiements",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    commandeId: varchar("commande_id", { length: 36 })
      .notNull()
      .unique()
      .references(() => commandes.id, { onDelete: "cascade" }),
    montant: integer("montant").notNull(),           // centimes
    methode: methodePaiementEnum("methode").notNull(),
    statut: statutPaiementEnum("statut").notNull().default("en_attente"),
    // Référence externe (Mobile Money, Stripe, etc.)
    referenceExterne: varchar("reference_externe", { length: 255 }),
    // Mobile Money spécifique
    numeroMobileMoney: varchar("numero_mobile_money", { length: 20 }),
    operateur: varchar("operateur", { length: 50 }),  // "Orange Money", "MTN", "Wave"
    payeAt: timestamp("paye_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    commandeIdx: index("idx_paiements_commande").on(table.commandeId),
    statutIdx:   index("idx_paiements_statut").on(table.statut),
  })
);

// ============================================================================
// LIVRAISONS
// ============================================================================

export const livreurs = pgTable(
  "livreurs",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    restaurantId: varchar("restaurant_id", { length: 36 })
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    nom: varchar("nom", { length: 255 }).notNull(),
    telephone: varchar("telephone", { length: 20 }).notNull(),
    vehicule: varchar("vehicule", { length: 50 }),    // "Moto", "Vélo", "Voiture"
    numeroVehicule: varchar("numero_vehicule", { length: 20 }),
    enLigne: boolean("en_ligne").notNull().default(false),
    actif: boolean("actif").notNull().default(true),
    // Position temps réel (optionnel)
    latitudeActuelle: doublePrecision("latitude_actuelle"),
    longitudeActuelle: doublePrecision("longitude_actuelle"),
    dernierePosition: timestamp("derniere_position", { withTimezone: true }),
    // Stats
    nombreLivraisons: integer("nombre_livraisons").notNull().default(0),
    noteMoyenne: real("note_moyenne").default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    restaurantIdx: index("idx_livreurs_restaurant").on(table.restaurantId),
  })
);

export const livraisons = pgTable(
  "livraisons",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    commandeId: varchar("commande_id", { length: 36 })
      .notNull()
      .unique()
      .references(() => commandes.id, { onDelete: "cascade" }),
    livreurId: varchar("livreur_id", { length: 36 }).references(
      () => livreurs.id,
      { onDelete: "set null" }
    ),
    statut: statutLivraisonEnum("statut").notNull().default("en_attente"),
    adresse: text("adresse").notNull(),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    distanceKm: real("distance_km"),
    dureeEstimeeMin: integer("duree_estimee_min"),
    heureAssignee: timestamp("heure_assignee", { withTimezone: true }),
    heureDepart: timestamp("heure_depart", { withTimezone: true }),
    heureLivree: timestamp("heure_livree", { withTimezone: true }),
    noteClient: integer("note_client"),           // 1-5
    commentaireClient: text("commentaire_client"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    commandeIdx: index("idx_livraisons_commande").on(table.commandeId),
    livreurIdx:  index("idx_livraisons_livreur").on(table.livreurId),
    statutIdx:   index("idx_livraisons_statut").on(table.statut),
  })
);

// ============================================================================
// PROMOTIONS
// ============================================================================

export const promotions = pgTable(
  "promotions",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    restaurantId: varchar("restaurant_id", { length: 36 })
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    // Ciblage (null = s'applique à toute la commande)
    platId: varchar("plat_id", { length: 36 }).references(() => plats.id, {
      onDelete: "cascade",
    }),
    categorieId: varchar("categorie_id", { length: 36 }).references(
      () => categories.id,
      { onDelete: "cascade" }
    ),
    nom: varchar("nom", { length: 255 }).notNull(),
    description: text("description"),
    type: typePromotionEnum("type").notNull(),
    valeur: integer("valeur").notNull().default(0), // % ou montant fixe en centimes
    codePromo: varchar("code_promo", { length: 50 }).unique(),
    // Contraintes
    montantMinCommande: integer("montant_min_commande").default(0),
    utilisationsMax: integer("utilisations_max"),
    utilisationsActuelles: integer("utilisations_actuelles").notNull().default(0),
    // Période
    dateDebut: timestamp("date_debut", { withTimezone: true }).notNull(),
    dateFin: timestamp("date_fin", { withTimezone: true }),
    actif: boolean("actif").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    restaurantIdx: index("idx_promotions_restaurant").on(table.restaurantId),
    codePromoIdx:  index("idx_promotions_code").on(table.codePromo),
    dateIdx:       index("idx_promotions_dates").on(table.dateDebut, table.dateFin),
  })
);

// ============================================================================
// AVIS
// ============================================================================

export const avis = pgTable(
  "avis",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    commandeId: varchar("commande_id", { length: 36 })
      .notNull()
      .references(() => commandes.id, { onDelete: "cascade" }),
    restaurantId: varchar("restaurant_id", { length: 36 })
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    clientId: varchar("client_id", { length: 36 }).references(
      () => clients.id,
      { onDelete: "set null" }
    ),
    // Note globale + détails
    note: integer("note").notNull(),               // 1-5
    noteNourriture: integer("note_nourriture"),    // 1-5
    noteLivraison: integer("note_livraison"),      // 1-5
    noteService: integer("note_service"),          // 1-5
    commentaire: text("commentaire"),
    // Réponse du restaurateur
    reponseRestaurant: text("reponse_restaurant"),
    reponduAt: timestamp("repondu_at", { withTimezone: true }),
    // Modération
    visible: boolean("visible").notNull().default(true),
    signale: boolean("signale").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    restaurantIdx: index("idx_avis_restaurant").on(table.restaurantId),
    clientIdx:     index("idx_avis_client").on(table.clientId),
    commandeIdx:   uniqueIndex("idx_avis_commande").on(table.commandeId), // 1 avis / commande
  })
);

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export const notifications = pgTable(
  "notifications",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    // Destinataire : soit un user (restaurateur), soit un client
    userId: varchar("user_id", { length: 36 }).references(() => users.id, {
      onDelete: "cascade",
    }),
    clientId: varchar("client_id", { length: 36 }).references(
      () => clients.id,
      { onDelete: "cascade" }
    ),
    type: typeNotificationEnum("type").notNull(),
    titre: varchar("titre", { length: 255 }).notNull(),
    message: text("message").notNull(),
    // Lien vers la ressource concernée
    lienType: varchar("lien_type", { length: 50 }),   // "commande", "avis"
    lienId: varchar("lien_id", { length: 36 }),
    lue: boolean("lue").notNull().default(false),
    lueAt: timestamp("lue_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    userIdx:    index("idx_notifications_user").on(table.userId),
    clientIdx:  index("idx_notifications_client").on(table.clientId),
    lueIdx:     index("idx_notifications_lue").on(table.lue),
  })
);

// ============================================================================
// TYPES AUXILIAIRES JSONB
// ============================================================================

export interface CommandeItemDB {
  platId: string;
  nom: string;
  prix: number;       // centimes, snapshot au moment de la commande
  quantite: number;
  note?: string;      // note spéciale pour ce plat
}

// ============================================================================
// RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ one, many }) => ({
  restaurant:    one(restaurants, {
    fields: [users.id],
    references: [restaurants.userId],
  }),
  notifications: many(notifications),
}));

export const restaurantsRelations = relations(restaurants, ({ one, many }) => ({
  user:        one(users, {
    fields: [restaurants.userId],
    references: [users.id],
  }),
  abonnement:  one(abonnements, {
    fields: [restaurants.id],
    references: [abonnements.restaurantId],
  }),
  creneaux:    many(creneauxHoraires),
  categories:  many(categories),
  plats:       many(plats),
  commandes:   many(commandes),
  promotions:  many(promotions),
  avis:        many(avis),
  livreurs:    many(livreurs),
}));

export const abonnementsRelations = relations(abonnements, ({ one }) => ({
  restaurant: one(restaurants, {
    fields: [abonnements.restaurantId],
    references: [restaurants.id],
  }),
}));

export const creneauxHorairesRelations = relations(creneauxHoraires, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [creneauxHoraires.restaurantId],
    references: [restaurants.id],
  }),
  categories: many(categories),
  plats:      many(plats),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [categories.restaurantId],
    references: [restaurants.id],
  }),
  creneau: one(creneauxHoraires, {
    fields: [categories.creneauId],
    references: [creneauxHoraires.id],
  }),
  plats:      many(plats),
  promotions: many(promotions),
}));

export const platsRelations = relations(plats, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [plats.restaurantId],
    references: [restaurants.id],
  }),
  categorie: one(categories, {
    fields: [plats.categorieId],
    references: [categories.id],
  }),
  creneau: one(creneauxHoraires, {
    fields: [plats.creneauId],
    references: [creneauxHoraires.id],
  }),
  promotions: many(promotions),
}));

export const clientsRelations = relations(clients, ({ many }) => ({
  commandes:     many(commandes),
  avis:          many(avis),
  notifications: many(notifications),
}));

export const commandesRelations = relations(commandes, ({ one }) => ({
  restaurant: one(restaurants, {
    fields: [commandes.restaurantId],
    references: [restaurants.id],
  }),
  client: one(clients, {
    fields: [commandes.clientId],
    references: [clients.id],
  }),
  paiement:  one(paiements, {
    fields: [commandes.id],
    references: [paiements.commandeId],
  }),
  livraison: one(livraisons, {
    fields: [commandes.id],
    references: [livraisons.commandeId],
  }),
  avis: one(avis, {
    fields: [commandes.id],
    references: [avis.commandeId],
  }),
}));

export const paiementsRelations = relations(paiements, ({ one }) => ({
  commande: one(commandes, {
    fields: [paiements.commandeId],
    references: [commandes.id],
  }),
}));

export const livreursRelations = relations(livreurs, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [livreurs.restaurantId],
    references: [restaurants.id],
  }),
  livraisons: many(livraisons),
}));

export const livraisonsRelations = relations(livraisons, ({ one }) => ({
  commande: one(commandes, {
    fields: [livraisons.commandeId],
    references: [commandes.id],
  }),
  livreur: one(livreurs, {
    fields: [livraisons.livreurId],
    references: [livreurs.id],
  }),
}));

export const promotionsRelations = relations(promotions, ({ one }) => ({
  restaurant: one(restaurants, {
    fields: [promotions.restaurantId],
    references: [restaurants.id],
  }),
  plat: one(plats, {
    fields: [promotions.platId],
    references: [plats.id],
  }),
  categorie: one(categories, {
    fields: [promotions.categorieId],
    references: [categories.id],
  }),
}));

export const avisRelations = relations(avis, ({ one }) => ({
  commande: one(commandes, {
    fields: [avis.commandeId],
    references: [commandes.id],
  }),
  restaurant: one(restaurants, {
    fields: [avis.restaurantId],
    references: [restaurants.id],
  }),
  client: one(clients, {
    fields: [avis.clientId],
    references: [clients.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  client: one(clients, {
    fields: [notifications.clientId],
    references: [clients.id],
  }),
}));