import {
  pgTable,
  pgEnum,
  text,
  integer,
  boolean,
  timestamp,
  date,
  jsonb,
  doublePrecision,
  real,
  time,
  varchar,
  uuid,
  uniqueIndex,
  index,
  check,
  customType,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import {
  PAYMENT_METHODS,
  PAYMENT_NETWORKS,
  type PaymentReturnChannel,
  PAYMENT_STATUSES,
  TRANSACTION_STATUSES,
  TRANSACTION_TYPES,
} from "@/modules/transactions/model";
import {
  GEO_ASSIGNMENT_STATUSES,
  GEO_SOURCE_OBJECT_TYPES,
  GEO_SOURCE_TYPES,
  SERVICE_ACTIVITY_TYPES,
  SERVICE_MARKET_AREA_OPERATIONS,
  SERVICE_MARKET_CAPABILITY_STATUSES,
  SERVICE_MARKET_STATUSES,
} from "@/modules/service-markets/model";
import {
  IDENTITY_DOCUMENT_SIDES,
  IDENTITY_DOCUMENT_SCAN_STATUSES,
  IDENTITY_DOCUMENT_TYPES,
  IDENTITY_VERIFICATION_STATUSES,
  type IdentityDocumentContentType,
} from "@/modules/identity/model";
import {
  RESIDENCE_AUDIT_ACTIONS,
  RESIDENCE_RESERVATION_STATUSES,
} from "@/modules/residences/model";
import type { SubscriptionCataloguePayload } from "@/modules/subscriptions/contracts";
import {
  DELIVERY_ACTOR_TYPES,
  DELIVERY_EVENT_TYPES,
  DELIVERY_OFFER_STATUSES,
  DELIVERY_PROOF_METHODS,
  DELIVERY_STATUSES,
  DRIVER_CASH_COLLECTION_STATUSES,
} from "@/modules/deliveries/model";

// ============================================================================
// ENUMS
// ============================================================================

export const roleEnum = pgEnum("role", [
  "partner",
  "admin",
]);

export const activityTypeEnum = pgEnum("activity_type", [
  "restaurant",
  "residence",
]);

export const quotaResourceTypeEnum = pgEnum("quota_resource_type", [
  "category",
  "dish",
  "residence",
]);

export const modeCommandeEnum = pgEnum("mode_commande", [
  "sur_place",
  "livraison",
  "emporter",
]);

export const statutCommandeEnum = pgEnum("statut_commande", [
  "en_attente_paiement",
  "recue",
  "en_preparation",
  "prete",
  "servie",
  "annulee",
]);

export const transactionTypeEnum = pgEnum("transaction_type", TRANSACTION_TYPES);
export const transactionStatusEnum = pgEnum(
  "transaction_status",
  TRANSACTION_STATUSES,
);
export const paymentStatusEnum = pgEnum("payment_status", PAYMENT_STATUSES);
export const paymentMethodEnum = pgEnum("payment_method", PAYMENT_METHODS);
export const paymentNetworkEnum = pgEnum("payment_network", PAYMENT_NETWORKS);
export const serviceMarketStatusEnum = pgEnum(
  "service_market_status",
  SERVICE_MARKET_STATUSES,
);
export const serviceMarketCapabilityStatusEnum = pgEnum(
  "service_market_capability_status",
  SERVICE_MARKET_CAPABILITY_STATUSES,
);
export const serviceActivityTypeEnum = pgEnum(
  "service_activity_type",
  SERVICE_ACTIVITY_TYPES,
);
export const geoAssignmentStatusEnum = pgEnum(
  "geo_assignment_status",
  GEO_ASSIGNMENT_STATUSES,
);
export const geoSourceEnum = pgEnum("geo_source", GEO_SOURCE_TYPES);
export const geoSourceObjectTypeEnum = pgEnum(
  "geo_source_object_type",
  GEO_SOURCE_OBJECT_TYPES,
);
export const serviceMarketAreaOperationEnum = pgEnum(
  "service_market_area_operation",
  SERVICE_MARKET_AREA_OPERATIONS,
);
export const identityVerificationStatusEnum = pgEnum(
  "identity_verification_status",
  IDENTITY_VERIFICATION_STATUSES,
);
export const identityDocumentTypeEnum = pgEnum(
  "identity_document_type",
  IDENTITY_DOCUMENT_TYPES,
);
export const identityDocumentSideEnum = pgEnum(
  "identity_document_side",
  IDENTITY_DOCUMENT_SIDES,
);
export const identityDocumentScanStatusEnum = pgEnum(
  "identity_document_scan_status",
  IDENTITY_DOCUMENT_SCAN_STATUSES,
);
export const residenceReservationStatusEnum = pgEnum(
  "residence_reservation_status",
  RESIDENCE_RESERVATION_STATUSES,
);

export const statutLivraisonEnum = pgEnum(
  "statut_livraison",
  DELIVERY_STATUSES,
);
export const deliveryOfferStatusEnum = pgEnum(
  "delivery_offer_status",
  DELIVERY_OFFER_STATUSES,
);
export const deliveryActorTypeEnum = pgEnum(
  "delivery_actor_type",
  DELIVERY_ACTOR_TYPES,
);
export const deliveryEventTypeEnum = pgEnum(
  "delivery_event_type",
  DELIVERY_EVENT_TYPES,
);
export const deliveryProofMethodEnum = pgEnum(
  "delivery_proof_method",
  DELIVERY_PROOF_METHODS,
);
export const driverCashCollectionStatusEnum = pgEnum(
  "driver_cash_collection_status",
  DRIVER_CASH_COLLECTION_STATUSES,
);

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
  "abonnement_valide",
  "abonnement_refuse",
  "echeance_proche",
  "abonnement_regrade",
  "abonnement_suspendu",
  "abonnement_expire",
  "restaurant_valide",
  "restaurant_rejete",
  "commission_cash_threshold",
  "delivery_offer_received",
  "delivery_offer_declined",
  "delivery_started",
  "delivery_completed",
  "delivery_failed",
  "cash_remittance_confirmed",
]);

// ── Nouveau : code d'offre du catalogue (3 offres fixes)
export const planCodeEnum = pgEnum("plan_code", [
  "decouverte",
  "croissance",
  "partenaire_fier",
]);

export const discoveryEventTypeEnum = pgEnum("discovery_event_type", [
  "impression",
  "click",
  "detail_open",
  "conversion",
]);

export const discoveryPlacementEnum = pgEnum("discovery_placement", [
  "promoted",
  "organic",
]);

// ── Statut d'une demande d'abonnement
export const statutDemandeEnum = pgEnum("statut_demande_abonnement", [
  "en_attente",
  "validee",
  "refusee",
  "annulee",
]);

// ── Statut d'une période d'abonnement active
export const statutPeriodeEnum = pgEnum("statut_periode_abonnement", [
  "active",
  "expiree",
  "terminee",
  "suspendue",
  "annulee",
]);

export const raisonFinPeriodeEnum = pgEnum("raison_fin_periode_abonnement", [
  "expiration_naturelle",
  "upgrade",
  "annulation",
]);

// ── Moyen de règlement (paiement abonnement)
export const moyenReglementEnum = pgEnum("moyen_reglement", [
  "mobile_money",
  "carte",
  "virement",
  "especes",
  "cheque",
]);

export const commissionCommercialStatusEnum = pgEnum(
  "commission_commercial_status",
  ["pending", "due", "void"],
);

export const commissionCollectionModeEnum = pgEnum(
  "commission_collection_mode",
  ["cash_receivable", "provider_split"],
);

export const commissionSettlementSourceEnum = pgEnum(
  "commission_settlement_source",
  ["manual_admin", "provider_recovery", "paystack_direct"],
);

export const paymentProviderAccountStatusEnum = pgEnum(
  "payment_provider_account_status",
  ["active", "disabled"],
);

export const commissionSettlementStatusEnum = pgEnum(
  "commission_settlement_status",
  ["pending", "confirmed", "failed", "void"],
);

// ============================================================================
// USERS  (partenaires & admins)
// ============================================================================

export const users = pgTable(
  "users",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    email: varchar("email", { length: 255 }).notNull().unique(),
    password: text("password").notNull(),
    role: roleEnum("role").notNull().default("partner"),
    nom: varchar("nom", { length: 255 }).notNull(),
    telephone: varchar("telephone", { length: 20 }).notNull(),
    avatarUrl: text("avatar_url"),
    // Sécurité / session
    emailVerifie: boolean("email_verifie").notNull().default(false),
    tokenVerifEmail: text("token_verif_email"),
    tokenResetPassword: text("token_reset_password"),
    tokenResetExpireAt: timestamp("token_reset_expire_at", { withTimezone: true }),
    dernierConnexion: timestamp("dernier_connexion", { withTimezone: true }),
    suspendu: boolean("suspendu").notNull().default(false),
    motifSuspension: text("motif_suspension"),
    suspenduAt: timestamp("suspendu_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    emailIdx: uniqueIndex("idx_users_email").on(table.email),
    roleIdx: index("idx_users_role").on(table.role),
  })
);

// ============================================================================
// PARTNER ACCOUNTS (identité commerciale transversale)
// ============================================================================

export const partnerAccounts = pgTable(
  "partner_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    activityType: activityTypeEnum("activity_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    userUnique: uniqueIndex("partner_accounts_user_id_unique").on(table.userId),
    activityTypeIdx: index("partner_accounts_activity_type_idx").on(table.activityType),
  }),
);

// ============================================================================
// IDENTITY — KYC PROPRIÉTAIRE MANUEL
// ============================================================================

export const partnerIdentityVerifications = pgTable(
  "partner_identity_verifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    partnerAccountId: uuid("partner_account_id")
      .notNull()
      .references(() => partnerAccounts.id, { onDelete: "restrict" }),
    status: identityVerificationStatusEnum("status")
      .notNull()
      .default("not_submitted"),
    legalName: varchar("legal_name", { length: 255 }),
    documentType: identityDocumentTypeEnum("document_type"),
    documentCountryCode: varchar("document_country_code", { length: 2 }),
    documentExpiresOn: date("document_expires_on"),
    rejectionReason: text("rejection_reason"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedByAdminId: varchar("reviewed_by_admin_id", { length: 36 }).references(
      () => users.id,
      { onDelete: "restrict" },
    ),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    partnerUnique: uniqueIndex(
      "partner_identity_verifications_partner_unique",
    ).on(table.partnerAccountId),
    pendingReviewIdx: index(
      "partner_identity_verifications_pending_review_idx",
    )
      .on(table.submittedAt, table.id)
      .where(sql`${table.status} = 'pending'`),
    reviewedByAdminIdx: index(
      "partner_identity_verifications_reviewed_by_admin_idx",
    ).on(table.reviewedByAdminId),
    countryCodeValid: check(
      "partner_identity_verifications_country_code_valid",
      sql`${table.documentCountryCode} IS NULL OR ${table.documentCountryCode} ~ '^[A-Z]{2}$'`,
    ),
    lifecycleCoherent: check(
      "partner_identity_verifications_lifecycle_coherent",
      sql`(${table.status} = 'not_submitted' AND ${table.submittedAt} IS NULL AND ${table.reviewedAt} IS NULL AND ${table.reviewedByAdminId} IS NULL AND ${table.verifiedAt} IS NULL AND ${table.rejectionReason} IS NULL)
        OR (${table.status} = 'pending' AND ${table.legalName} IS NOT NULL AND ${table.documentType} IS NOT NULL AND ${table.documentCountryCode} IS NOT NULL AND ${table.documentExpiresOn} IS NOT NULL AND ${table.submittedAt} IS NOT NULL AND ${table.reviewedAt} IS NULL AND ${table.reviewedByAdminId} IS NULL AND ${table.verifiedAt} IS NULL AND ${table.rejectionReason} IS NULL)
        OR (${table.status} = 'verified' AND ${table.legalName} IS NOT NULL AND ${table.documentType} IS NOT NULL AND ${table.documentCountryCode} IS NOT NULL AND ${table.documentExpiresOn} IS NOT NULL AND ${table.submittedAt} IS NOT NULL AND ${table.reviewedAt} IS NOT NULL AND ${table.reviewedByAdminId} IS NOT NULL AND ${table.verifiedAt} IS NOT NULL AND ${table.rejectionReason} IS NULL)
        OR (${table.status} = 'rejected' AND ${table.legalName} IS NOT NULL AND ${table.documentType} IS NOT NULL AND ${table.documentCountryCode} IS NOT NULL AND ${table.documentExpiresOn} IS NOT NULL AND ${table.submittedAt} IS NOT NULL AND ${table.reviewedAt} IS NOT NULL AND ${table.reviewedByAdminId} IS NOT NULL AND ${table.verifiedAt} IS NULL AND length(trim(${table.rejectionReason})) >= 10)`,
    ),
  }),
);

export const partnerIdentityDocuments = pgTable(
  "partner_identity_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    verificationId: uuid("verification_id")
      .notNull()
      .references(() => partnerIdentityVerifications.id, {
        onDelete: "restrict",
      }),
    side: identityDocumentSideEnum("side").notNull(),
    storageKey: text("storage_key").notNull(),
    contentType: varchar("content_type", { length: 50 })
      .notNull()
      .$type<IdentityDocumentContentType>(),
    sizeBytes: integer("size_bytes").notNull(),
    sha256: varchar("sha256", { length: 64 }).notNull(),
    scanStatus: identityDocumentScanStatusEnum("scan_status")
      .notNull()
      .default("pending"),
    cleanStorageKey: text("clean_storage_key"),
    cleanContentType: varchar("clean_content_type", { length: 50 })
      .$type<IdentityDocumentContentType>(),
    cleanSizeBytes: integer("clean_size_bytes"),
    cleanSha256: varchar("clean_sha256", { length: 64 }),
    scanAttempts: integer("scan_attempts").notNull().default(0),
    scanStartedAt: timestamp("scan_started_at", { withTimezone: true }),
    scanCompletedAt: timestamp("scan_completed_at", { withTimezone: true }),
    scanEngine: varchar("scan_engine", { length: 100 }),
    scanResult: varchar("scan_result", { length: 255 }),
    lastScanError: text("last_scan_error"),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    verificationSideUnique: uniqueIndex(
      "partner_identity_documents_verification_side_unique",
    ).on(table.verificationId, table.side),
    storageKeyUnique: uniqueIndex(
      "partner_identity_documents_storage_key_unique",
    ).on(table.storageKey),
    cleanStorageKeyUnique: uniqueIndex(
      "partner_identity_documents_clean_storage_key_unique",
    )
      .on(table.cleanStorageKey)
      .where(sql`${table.cleanStorageKey} IS NOT NULL`),
    scanQueueIdx: index("partner_identity_documents_scan_queue_idx")
      .on(table.scanStatus, table.scanStartedAt, table.uploadedAt)
      .where(sql`${table.scanStatus} IN ('pending', 'processing', 'error')`),
    contentTypeValid: check(
      "partner_identity_documents_content_type_valid",
      sql`${table.contentType} IN ('image/jpeg', 'image/png', 'application/pdf')`,
    ),
    sizeValid: check(
      "partner_identity_documents_size_valid",
      sql`${table.sizeBytes} > 0 AND ${table.sizeBytes} <= ${8 * 1024 * 1024}`,
    ),
    sha256Valid: check(
      "partner_identity_documents_sha256_valid",
      sql`${table.sha256} ~ '^[0-9a-f]{64}$'`,
    ),
    scanAttemptsValid: check(
      "partner_identity_documents_scan_attempts_valid",
      sql`${table.scanAttempts} >= 0 AND ${table.scanAttempts} <= 10`,
    ),
    cleanPayloadCoherent: check(
      "partner_identity_documents_clean_payload_coherent",
      sql`(${table.scanStatus} = 'clean' AND ${table.cleanStorageKey} IS NOT NULL AND ${table.cleanContentType} IS NOT NULL AND ${table.cleanSizeBytes} > 0 AND ${table.cleanSha256} ~ '^[0-9a-f]{64}$' AND ${table.scanCompletedAt} IS NOT NULL)
        OR (${table.scanStatus} <> 'clean' AND ${table.cleanStorageKey} IS NULL AND ${table.cleanContentType} IS NULL AND ${table.cleanSizeBytes} IS NULL AND ${table.cleanSha256} IS NULL)`,
    ),
  }),
);

export const paymentProviderAccounts = pgTable(
  "payment_provider_accounts",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    partnerAccountId: uuid("partner_account_id")
      .notNull()
      .references(() => partnerAccounts.id, { onDelete: "restrict" }),
    provider: varchar("provider", { length: 50 }).notNull(),
    providerAccountReference: varchar("provider_account_reference", { length: 255 }).notNull(),
    status: paymentProviderAccountStatusEnum("status").notNull().default("active"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull(),
    linkedByAdminId: varchar("linked_by_admin_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    disabledAt: timestamp("disabled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().$defaultFn(() => new Date()),
  },
  (table) => ({
    partnerProviderUnique: uniqueIndex("payment_provider_accounts_partner_provider_unique").on(
      table.partnerAccountId,
      table.provider,
    ),
    providerReferenceUnique: uniqueIndex("payment_provider_accounts_provider_reference_unique").on(
      table.provider,
      table.providerAccountReference,
    ),
    activeLookupIdx: index("payment_provider_accounts_active_lookup_idx").on(
      table.partnerAccountId,
      table.provider,
      table.status,
    ),
    providerPaystackOnly: check(
      "payment_provider_accounts_paystack_only",
      sql`${table.provider} = 'paystack'`,
    ),
    lifecycleCoherent: check(
      "payment_provider_accounts_lifecycle_coherent",
      sql`(${table.status} = 'active' AND ${table.disabledAt} IS NULL) OR (${table.status} = 'disabled' AND ${table.disabledAt} IS NOT NULL)`,
    ),
  }),
);

// ============================================================================
// SERVICE MARKETS (géographie commerciale transversale)
// ============================================================================

const multiPolygon4326 = customType<{
  data: string;
  driverData: string;
}>({
  dataType() {
    return "geometry(MultiPolygon,4326)";
  },
});

export const geoSourceAreas = pgTable(
  "geo_source_areas",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    source: geoSourceEnum("source").notNull().default("osm"),
    sourceType: geoSourceObjectTypeEnum("source_type")
      .notNull()
      .default("relation"),
    sourceRef: varchar("source_ref", { length: 255 }).notNull(),
    sourceVersion: varchar("source_version", { length: 100 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    nameLocal: varchar("name_local", { length: 255 }),
    countryCode: varchar("country_code", { length: 2 }).notNull(),
    adminLevel: varchar("admin_level", { length: 20 }),
    tags: jsonb("tags").$type<Record<string, string>>().notNull().default({}),
    geometry: multiPolygon4326("geometry").notNull(),
    geometryChecksum: varchar("geometry_checksum", { length: 64 }).notNull(),
    sourceUpdatedAt: timestamp("source_updated_at", { withTimezone: true }),
    importedAt: timestamp("imported_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    sourceVersionUnique: uniqueIndex("geo_source_areas_source_version_unique").on(
      table.source,
      table.sourceRef,
      table.sourceVersion,
    ),
    countryIdx: index("geo_source_areas_country_idx").on(table.countryCode),
  }),
);

export const serviceMarkets = pgTable(
  "service_markets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 80 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    countryCode: varchar("country_code", { length: 2 }).notNull(),
    status: serviceMarketStatusEnum("status").notNull().default("draft"),
    activeVersionId: uuid("active_version_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => ({
    countryStatusIdx: index("service_markets_country_status_idx").on(
      table.countryCode,
      table.status,
    ),
  }),
);

export const serviceMarketVersions = pgTable(
  "service_market_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    serviceMarketId: uuid("service_market_id")
      .notNull()
      .references(() => serviceMarkets.id, { onDelete: "restrict" }),
    version: integer("version").notNull(),
    geometry: multiPolygon4326("geometry").notNull(),
    geometryChecksum: varchar("geometry_checksum", { length: 64 }).notNull(),
    sourceManifest: jsonb("source_manifest")
      .$type<Record<string, unknown>>()
      .notNull(),
    createdByUserId: varchar("created_by_user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
  },
  (table) => ({
    marketVersionUnique: uniqueIndex("service_market_versions_market_version_unique").on(
      table.serviceMarketId,
      table.version,
    ),
    marketLifecycleIdx: index("service_market_versions_market_lifecycle_idx").on(
      table.serviceMarketId,
      table.publishedAt,
      table.retiredAt,
    ),
  }),
);

export const serviceMarketCapabilities = pgTable(
  "service_market_capabilities",
  {
    serviceMarketId: uuid("service_market_id")
      .notNull()
      .references(() => serviceMarkets.id, { onDelete: "restrict" }),
    activityType: serviceActivityTypeEnum("activity_type").notNull(),
    status: serviceMarketCapabilityStatusEnum("status")
      .notNull()
      .default("disabled"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
    prelaunchAt: timestamp("prelaunch_at", { withTimezone: true }),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    pausedAt: timestamp("paused_at", { withTimezone: true }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.serviceMarketId, table.activityType] }),
    activityStatusIdx: index("service_market_capabilities_activity_status_idx").on(
      table.activityType,
      table.status,
    ),
  }),
);

export const serviceMarketVersionAreas = pgTable(
  "service_market_version_areas",
  {
    serviceMarketVersionId: uuid("service_market_version_id")
      .notNull()
      .references(() => serviceMarketVersions.id, { onDelete: "cascade" }),
    geoSourceAreaId: uuid("geo_source_area_id")
      .notNull()
      .references(() => geoSourceAreas.id, { onDelete: "restrict" }),
    operation: serviceMarketAreaOperationEnum("operation")
      .notNull()
      .default("include"),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.serviceMarketVersionId, table.geoSourceAreaId],
    }),
  }),
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
    partnerAccountId: uuid("partner_account_id")
      .notNull()
      .unique()
      .references(() => partnerAccounts.id, { onDelete: "restrict" }),
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
    serviceMarketId: uuid("service_market_id").references(
      () => serviceMarkets.id,
      { onDelete: "restrict" },
    ),
    serviceMarketVersionId: uuid("service_market_version_id").references(
      () => serviceMarketVersions.id,
      { onDelete: "restrict" },
    ),
    geoAssignmentStatus: geoAssignmentStatusEnum("geo_assignment_status")
      .notNull()
      .default("pending_review"),
    geoAssignedAt: timestamp("geo_assigned_at", { withTimezone: true }),
    logoUrl: text("logo_url"),
    banniereUrl: text("banniere_url"),
    // Tous les montants métier Toutci sont stockés en FCFA entiers.
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
    // Validation admin
    motifRejet: text("motif_rejet"),
    valideParUserId: varchar("valide_par_user_id", { length: 36 })
      .references(() => users.id, { onDelete: "set null" }),
    valideAt: timestamp("valide_at", { withTimezone: true }),
    // Suspension
    suspendu: boolean("suspendu").notNull().default(false),
    motifSuspension: text("motif_suspension"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    slugIdx:   uniqueIndex("idx_restaurants_slug").on(table.slug),
    villeIdx:  index("idx_restaurants_ville").on(table.ville),
    actifIdx:  index("idx_restaurants_actif").on(table.actif),
    villeActifIdx: index("idx_restaurants_ville_actif").on(
      table.ville,
      table.actif
    ),
    marketVisibilityIdx: index("restaurants_market_visibility_idx").on(
      table.serviceMarketId,
      table.actif,
      table.suspendu,
    ),
    fraisLivraisonNonNegatif: check(
      "restaurants_frais_livraison_non_negatif",
      sql`${table.fraisLivraison} >= 0`,
    ),
    commandeMinimumNonNegative: check(
      "restaurants_commande_minimum_non_negative",
      sql`${table.commandeMinimum} >= 0`,
    ),
  })
);

// ============================================================================
// RESIDENCES
// ============================================================================

export const residences = pgTable(
  "residences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    partnerAccountId: uuid("partner_account_id")
      .notNull()
      .references(() => partnerAccounts.id, { onDelete: "restrict" }),
    title: varchar("title", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 200 }).notNull(),
    description: text("description").notNull(),
    pricePerNightFcfa: integer("price_per_night_fcfa").notNull(),
    maxGuests: integer("max_guests").notNull(),
    address: text("address").notNull(),
    city: varchar("city", { length: 100 }).notNull(),
    country: varchar("country", { length: 100 })
      .notNull()
      .default("Côte d’Ivoire"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    publicationIntent: boolean("publication_intent").notNull().default(false),
    publicationEnabledAt: timestamp("publication_enabled_at", {
      withTimezone: true,
    }),
    firstPublishedAt: timestamp("first_published_at", { withTimezone: true }),
    actif: boolean("actif").notNull().default(false),
    motifRejet: text("motif_rejet"),
    validatedByAdminId: varchar("validated_by_admin_id", { length: 36 })
      .references(() => users.id, { onDelete: "set null" }),
    validatedAt: timestamp("validated_at", { withTimezone: true }),
    suspendu: boolean("suspendu").notNull().default(false),
    motifSuspension: text("motif_suspension"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    slugUnique: uniqueIndex("residences_slug_unique").on(table.slug),
    partnerIdx: index("residences_partner_account_idx").on(
      table.partnerAccountId,
      table.createdAt,
    ),
    moderationIdx: index("residences_moderation_idx").on(
      table.publicationIntent,
      table.actif,
      table.suspendu,
      table.createdAt,
    ),
    publicationEnabledIdx: index("residences_publication_enabled_idx").on(
      table.partnerAccountId,
      table.publicationEnabledAt,
    ),
    publicDiscoveryIdx: index("residences_public_discovery_idx")
      .on(table.firstPublishedAt, table.id)
      .where(
        sql`${table.publicationIntent} = true AND ${table.publicationEnabledAt} IS NOT NULL AND ${table.firstPublishedAt} IS NOT NULL AND ${table.actif} = true AND ${table.suspendu} = false AND ${table.archivedAt} IS NULL`,
      ),
    pricePositive: check(
      "residences_price_per_night_positive",
      sql`${table.pricePerNightFcfa} > 0`,
    ),
    capacityPositive: check(
      "residences_max_guests_positive",
      sql`${table.maxGuests} > 0`,
    ),
    coordinatesCoherent: check(
      "residences_coordinates_coherent",
      sql`(${table.latitude} IS NULL AND ${table.longitude} IS NULL) OR (${table.latitude} BETWEEN -90 AND 90 AND ${table.longitude} BETWEEN -180 AND 180)`,
    ),
    moderationCoherent: check(
      "residences_moderation_coherent",
      sql`(${table.actif} = false OR (${table.validatedAt} IS NOT NULL AND ${table.validatedByAdminId} IS NOT NULL AND ${table.motifRejet} IS NULL)) AND (${table.suspendu} = false OR length(trim(${table.motifSuspension})) >= 10)`,
    ),
  }),
);

export const residenceImages = pgTable(
  "residence_images",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    residenceId: uuid("residence_id")
      .notNull()
      .references(() => residences.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    altText: varchar("alt_text", { length: 255 }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    residenceIdx: index("residence_images_residence_idx").on(
      table.residenceId,
      table.sortOrder,
    ),
    residenceUrlUnique: uniqueIndex("residence_images_residence_url_unique").on(
      table.residenceId,
      table.url,
    ),
    sortOrderNonNegative: check(
      "residence_images_sort_order_non_negative",
      sql`${table.sortOrder} >= 0`,
    ),
  }),
);

export const residenceReservations = pgTable(
  "residence_reservations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    residenceId: uuid("residence_id")
      .notNull()
      .references(() => residences.id, { onDelete: "restrict" }),
    partnerAccountId: uuid("partner_account_id")
      .notNull()
      .references(() => partnerAccounts.id, { onDelete: "restrict" }),
    clientId: varchar("client_id", { length: 36 })
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    status: residenceReservationStatusEnum("status")
      .notNull()
      .default("en_attente_paiement"),
    checkIn: date("check_in").notNull(),
    checkOut: date("check_out").notNull(),
    nights: integer("nights").notNull(),
    guests: integer("guests").notNull(),
    pricePerNightSnapshotFcfa: integer("price_per_night_snapshot_fcfa")
      .notNull(),
    subtotalFcfa: integer("subtotal_fcfa").notNull(),
    totalFcfa: integer("total_fcfa").notNull(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancellationSource: varchar("cancellation_source", { length: 20 }),
    cancellationReason: varchar("cancellation_reason", { length: 500 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    residenceDatesIdx: index("residence_reservations_residence_dates_idx")
      .on(table.residenceId, table.checkIn, table.checkOut)
      .where(sql`${table.status} <> 'annulee'`),
    clientCreatedIdx: index("residence_reservations_client_created_idx").on(
      table.clientId,
      table.createdAt,
    ),
    partnerCreatedIdx: index("residence_reservations_partner_created_idx").on(
      table.partnerAccountId,
      table.createdAt,
    ),
    statusCreatedIdx: index("residence_reservations_status_created_idx").on(
      table.status,
      table.createdAt,
    ),
    stayValid: check(
      "residence_reservations_stay_valid",
      sql`${table.checkIn} < ${table.checkOut} AND ${table.nights} > 0 AND ${table.guests} > 0`,
    ),
    amountsValid: check(
      "residence_reservations_amounts_valid",
      sql`${table.pricePerNightSnapshotFcfa} > 0 AND ${table.subtotalFcfa} > 0 AND ${table.totalFcfa} = ${table.subtotalFcfa} AND ${table.subtotalFcfa} = ${table.pricePerNightSnapshotFcfa} * ${table.nights}`,
    ),
    lifecycleValid: check(
      "residence_reservations_lifecycle_valid",
      sql`(${table.status} = 'en_attente_paiement' AND ${table.confirmedAt} IS NULL AND ${table.cancelledAt} IS NULL)
        OR (${table.status} = 'confirmee' AND ${table.confirmedAt} IS NOT NULL AND ${table.cancelledAt} IS NULL)
        OR (${table.status} = 'annulee' AND ${table.cancelledAt} IS NOT NULL)`,
    ),
  }),
);

export const residenceUnavailablePeriods = pgTable(
  "residence_unavailable_periods",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    residenceId: uuid("residence_id")
      .notNull()
      .references(() => residences.id, { onDelete: "restrict" }),
    checkIn: date("check_in").notNull(),
    checkOut: date("check_out").notNull(),
    reason: varchar("reason", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    residenceDatesIdx: index(
      "residence_unavailable_periods_residence_dates_idx",
    ).on(table.residenceId, table.checkIn, table.checkOut),
    stayValid: check(
      "residence_unavailable_periods_stay_valid",
      sql`${table.checkIn} < ${table.checkOut}`,
    ),
  }),
);

// ============================================================================
// CATALOGUE DES OFFRES (source de vérité — 3 lignes fixes, non supprimables)
// ============================================================================

export const subscriptionPlans = pgTable(
  "subscription_plans",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    // Clé métier unique : decouverte | croissance | partenaire_fier
    code: planCodeEnum("code").notNull().unique(),
    nom: varchar("nom", { length: 100 }).notNull(),
    description: text("description"),
    // Tarif annuel en FCFA entiers (0 pour Découverte)
    prixAnnuelFcfa: integer("prix_annuel_fcfa").notNull().default(0),
    // Taux de commission en points de base (1500 = 15 %)
    tauxCommissionBps: integer("taux_commission_bps").notNull(),
    // Affichage
    ordre: integer("ordre").notNull().default(0),
    actif: boolean("actif").notNull().default(true),
    // Audit modification du catalogue
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedByAdminId: varchar("updated_by_admin_id", { length: 36 })
      .references(() => users.id, { onDelete: "set null" }),
  },
  (table) => ({
    codeIdx: uniqueIndex("idx_subscription_plans_code").on(table.code),
    ordreIdx: index("idx_subscription_plans_ordre").on(table.ordre),
    prixAnnuelNonNegatif: check(
      "subscription_plans_prix_annuel_fcfa_non_negatif",
      sql`${table.prixAnnuelFcfa} >= 0`,
    ),
    tauxCommissionValide: check(
      "subscription_plans_taux_commission_bps_valide",
      sql`${table.tauxCommissionBps} BETWEEN 0 AND 10000`,
    ),
    ordreNonNegatif: check(
      "subscription_plans_ordre_non_negatif",
      sql`${table.ordre} >= 0`,
    ),
  })
);

export const subscriptionPlanLimits = pgTable(
  "subscription_plan_limits",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    planId: varchar("plan_id", { length: 36 })
      .notNull()
      .references(() => subscriptionPlans.id, { onDelete: "cascade" }),
    activityType: activityTypeEnum("activity_type").notNull(),
    resourceType: quotaResourceTypeEnum("resource_type").notNull(),
    maxCount: integer("max_count"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    planResourceUnique: uniqueIndex("subscription_plan_limits_plan_activity_resource_unique")
      .on(table.planId, table.activityType, table.resourceType),
    planIdx: index("subscription_plan_limits_plan_idx").on(table.planId),
    maxCountValid: check(
      "subscription_plan_limits_max_count_valid",
      sql`${table.maxCount} IS NULL OR ${table.maxCount} >= 0`,
    ),
    compatibleResource: check(
      "subscription_plan_limits_activity_resource_valid",
      sql`(${table.activityType} = 'restaurant' AND ${table.resourceType} IN ('category', 'dish')) OR (${table.activityType} = 'residence' AND ${table.resourceType} = 'residence')`,
    ),
  }),
);

export const subscriptionPlanExposureBenefits = pgTable(
  "subscription_plan_exposure_benefits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    planId: varchar("plan_id", { length: 36 })
      .notNull()
      .references(() => subscriptionPlans.id, { onDelete: "cascade" }),
    activityType: activityTypeEnum("activity_type").notNull(),
    exposureWeight: integer("exposure_weight").notNull(),
    searchPromotedEligible: boolean("search_promoted_eligible")
      .notNull()
      .default(false),
    marketFeaturedEligible: boolean("market_featured_eligible")
      .notNull()
      .default(false),
    homepageFeaturedEligible: boolean("homepage_featured_eligible")
      .notNull()
      .default(false),
    partnerBadgeEnabled: boolean("partner_badge_enabled")
      .notNull()
      .default(false),
    recommended: boolean("recommended").notNull().default(false),
    ctaLabel: varchar("cta_label", { length: 80 }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    planActivityUnique: uniqueIndex(
      "subscription_plan_exposure_benefits_plan_activity_unique",
    ).on(table.planId, table.activityType),
    planIdx: index("subscription_plan_exposure_benefits_plan_idx").on(
      table.planId,
    ),
    activityWeightIdx: index(
      "subscription_plan_exposure_benefits_activity_weight_idx",
    ).on(table.activityType, table.exposureWeight),
    weightValid: check(
      "subscription_plan_exposure_benefits_weight_valid",
      sql`${table.exposureWeight} BETWEEN 1 AND 100`,
    ),
  }),
);

export const subscriptionPlanFeatureItems = pgTable(
  "subscription_plan_feature_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    planId: varchar("plan_id", { length: 36 })
      .notNull()
      .references(() => subscriptionPlans.id, { onDelete: "cascade" }),
    activityType: activityTypeEnum("activity_type").notNull(),
    label: varchar("label", { length: 160 }).notNull(),
    sortOrder: integer("sort_order").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    planActivityOrderUnique: uniqueIndex(
      "subscription_plan_feature_items_plan_activity_order_unique",
    ).on(table.planId, table.activityType, table.sortOrder),
    planActivityIdx: index(
      "subscription_plan_feature_items_plan_activity_idx",
    ).on(table.planId, table.activityType),
    orderValid: check(
      "subscription_plan_feature_items_order_valid",
      sql`${table.sortOrder} >= 0`,
    ),
  }),
);

export const discoveryPolicySettings = pgTable(
  "discovery_policy_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    activityType: activityTypeEnum("activity_type").notNull().unique(),
    enabled: boolean("enabled").notNull().default(true),
    sponsoredShareBps: integer("sponsored_share_bps").notNull().default(2_500),
    rotationWindowMinutes: integer("rotation_window_minutes")
      .notNull()
      .default(1_440),
    maxPromotedPerPartner: integer("max_promoted_per_partner")
      .notNull()
      .default(1),
    updatedByAdminId: varchar("updated_by_admin_id", { length: 36 }).references(
      () => users.id,
      { onDelete: "set null" },
    ),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    updatedByIdx: index("discovery_policy_settings_updated_by_idx").on(
      table.updatedByAdminId,
    ),
    sponsoredShareValid: check(
      "discovery_policy_settings_sponsored_share_valid",
      sql`${table.sponsoredShareBps} BETWEEN 0 AND 5000`,
    ),
    rotationWindowValid: check(
      "discovery_policy_settings_rotation_window_valid",
      sql`${table.rotationWindowMinutes} BETWEEN 15 AND 10080`,
    ),
    partnerLimitValid: check(
      "discovery_policy_settings_partner_limit_valid",
      sql`${table.maxPromotedPerPartner} BETWEEN 1 AND 10`,
    ),
  }),
);

export const discoveryEvents = pgTable(
  "discovery_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    attributionId: uuid("attribution_id").notNull(),
    eventType: discoveryEventTypeEnum("event_type").notNull(),
    activityType: activityTypeEnum("activity_type").notNull(),
    resourceId: varchar("resource_id", { length: 36 }).notNull(),
    partnerAccountId: uuid("partner_account_id")
      .notNull()
      .references(() => partnerAccounts.id, { onDelete: "cascade" }),
    planCode: planCodeEnum("plan_code").notNull(),
    placement: discoveryPlacementEnum("placement").notNull(),
    contextHash: varchar("context_hash", { length: 64 }).notNull(),
    conversionReferenceId: varchar("conversion_reference_id", { length: 36 }),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    attributionEventUnique: uniqueIndex(
      "discovery_events_attribution_event_unique",
    ).on(table.attributionId, table.eventType),
    reportingIdx: index("discovery_events_reporting_idx").on(
      table.occurredAt,
      table.activityType,
      table.planCode,
      table.placement,
    ),
    partnerIdx: index("discovery_events_partner_idx").on(
      table.partnerAccountId,
      table.occurredAt,
    ),
    conversionReferenceUnique: uniqueIndex(
      "discovery_events_conversion_reference_unique",
    )
      .on(table.activityType, table.conversionReferenceId)
      .where(sql`${table.eventType} = 'conversion'`),
    conversionReferenceValid: check(
      "discovery_events_conversion_reference_valid",
      sql`(${table.eventType} = 'conversion' AND ${table.conversionReferenceId} IS NOT NULL) OR (${table.eventType} <> 'conversion' AND ${table.conversionReferenceId} IS NULL)`,
    ),
  }),
);

export const subscriptionCatalogueDraft = pgTable(
  "subscription_catalogue_draft",
  {
    id: integer("id").primaryKey().default(1),
    payload: jsonb("payload").$type<SubscriptionCataloguePayload>().notNull(),
    updatedByAdminId: varchar("updated_by_admin_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    singleton: check("subscription_catalogue_draft_singleton", sql`${table.id} = 1`),
    updatedByIdx: index("subscription_catalogue_draft_updated_by_idx").on(
      table.updatedByAdminId,
    ),
  }),
);

export const subscriptionCatalogueRevisions = pgTable(
  "subscription_catalogue_revisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    version: integer("version").generatedAlwaysAsIdentity().unique(),
    payload: jsonb("payload").$type<SubscriptionCataloguePayload>().notNull(),
    publishedByAdminId: varchar("published_by_admin_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    publishedAt: timestamp("published_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    publishedByIdx: index("subscription_catalogue_revisions_published_by_idx").on(
      table.publishedByAdminId,
    ),
    publishedAtIdx: index("subscription_catalogue_revisions_published_at_idx").on(
      table.publishedAt,
    ),
  }),
);

// ============================================================================
// DEMANDES D'ABONNEMENT (partner account → changement/renouvellement)
// ============================================================================

export const subscriptionRequests = pgTable(
  "subscription_requests",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    partnerAccountId: uuid("partner_account_id")
      .notNull()
      .references(() => partnerAccounts.id, { onDelete: "restrict" }),
    // Offre demandée et montant figé au moment de la demande
    planCode: planCodeEnum("plan_code").notNull(),
    prixFigeFcfa: integer("prix_fige_fcfa").notNull().default(0),
    statut: statutDemandeEnum("statut").notNull().default("en_attente"),
    motifRefus: text("motif_refus"),
    // Admin qui a traité la demande
    traiteeParAdminId: varchar("traitee_par_admin_id", { length: 36 })
      .references(() => users.id, { onDelete: "set null" }),
    traiteeAt: timestamp("traitee_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    partnerAccountIdx: index("subscription_requests_partner_account_idx").on(table.partnerAccountId),
    statutIdx: index("idx_sub_requests_statut").on(table.statut),
    partnerAccountStatutIdx: index("subscription_requests_partner_account_statut_idx").on(
      table.partnerAccountId,
      table.statut
    ),
    onePendingPerPartnerAccount: uniqueIndex("subscription_requests_one_pending_per_partner_account")
      .on(table.partnerAccountId)
      .where(sql`${table.statut} = 'en_attente'`),
    prixFigeNonNegatif: check(
      "subscription_requests_prix_fige_fcfa_non_negatif",
      sql`${table.prixFigeFcfa} >= 0`,
    ),
  })
);

// ============================================================================
// PÉRIODES D'ABONNEMENT ACTIVES (historique par partner account)
// ============================================================================

export const subscriptionPeriods = pgTable(
  "subscription_periods",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    partnerAccountId: uuid("partner_account_id")
      .notNull()
      .references(() => partnerAccounts.id, { onDelete: "restrict" }),
    // Demande qui a déclenché cette période (null pour Découverte auto)
    requestId: varchar("request_id", { length: 36 })
      .references(() => subscriptionRequests.id, { onDelete: "set null" }),
    planCode: planCodeEnum("plan_code").notNull(),
    // Snapshot du taux au moment de la validation (protège l'historique)
    tauxCommissionBpsFige: integer("taux_commission_bps_fige").notNull(),
    // Paiement validé
    prixPayeFcfa: integer("prix_paye_fcfa").notNull().default(0),
    moyenReglement: moyenReglementEnum("moyen_reglement"),
    referenceReglement: varchar("reference_reglement", { length: 255 }),
    dateReglement: timestamp("date_reglement", { withTimezone: true }),
    // Qui a validé
    valideeParAdminId: varchar("validee_par_admin_id", { length: 36 })
      .references(() => users.id, { onDelete: "set null" }),
    // Période de validité
    dateDebut: timestamp("date_debut", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
    dateEcheance: timestamp("date_echeance", { withTimezone: true }), // null = découverte (pas d'échéance)
    statut: statutPeriodeEnum("statut").notNull().default("active"),
    // Une fin réelle distincte de l'échéance prévue conserve l'historique
    // des upgrades et autres clôtures anticipées sans ambiguïté.
    endedAt: timestamp("ended_at", { withTimezone: true }),
    endReason: raisonFinPeriodeEnum("end_reason"),
    // Motif de suspension/annulation si applicable
    motifSuspension: text("motif_suspension"),
    suspenduParAdminId: varchar("suspendu_par_admin_id", { length: 36 })
      .references(() => users.id, { onDelete: "set null" }),
    suspenduAt: timestamp("suspendu_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    partnerAccountIdx: index("subscription_periods_partner_account_idx").on(table.partnerAccountId),
    statutIdx: index("idx_sub_periods_statut").on(table.statut),
    partnerAccountStatutIdx: index("subscription_periods_partner_account_statut_idx").on(
      table.partnerAccountId,
      table.statut
    ),
    echeanceIdx: index("idx_sub_periods_echeance").on(table.dateEcheance),
    oneEffectivePaidPeriod: uniqueIndex("subscription_periods_one_active_paid_per_partner_account")
      .on(table.partnerAccountId)
      .where(sql`${table.statut} = 'active' AND ${table.planCode} <> 'decouverte'`),
    prixPayeNonNegatif: check(
      "subscription_periods_prix_paye_fcfa_non_negatif",
      sql`${table.prixPayeFcfa} >= 0`,
    ),
    historicalDiscoveryOnly: check(
      "subscription_periods_discovery_is_historical_only",
      sql`${table.planCode} <> 'decouverte' OR ${table.statut} NOT IN ('active', 'suspendue')`,
    ),
    validPlannedDates: check(
      "subscription_periods_valid_planned_dates",
      sql`${table.planCode} = 'decouverte' OR (${table.dateEcheance} IS NOT NULL AND ${table.dateEcheance} > ${table.dateDebut})`,
    ),
    coherentEnd: check(
      "subscription_periods_coherent_end",
      sql`(${table.endedAt} IS NULL) = (${table.endReason} IS NULL)`,
    ),
  })
);

export const subscriptionPeriodLimits = pgTable(
  "subscription_period_limits",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    subscriptionPeriodId: varchar("subscription_period_id", { length: 36 })
      .notNull()
      .references(() => subscriptionPeriods.id, { onDelete: "restrict" }),
    activityType: activityTypeEnum("activity_type").notNull(),
    resourceType: quotaResourceTypeEnum("resource_type").notNull(),
    maxCount: integer("max_count"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    periodResourceUnique: uniqueIndex("subscription_period_limits_period_activity_resource_unique")
      .on(table.subscriptionPeriodId, table.activityType, table.resourceType),
    periodIdx: index("subscription_period_limits_period_idx").on(table.subscriptionPeriodId),
    maxCountValid: check(
      "subscription_period_limits_max_count_valid",
      sql`${table.maxCount} IS NULL OR ${table.maxCount} >= 0`,
    ),
    compatibleResource: check(
      "subscription_period_limits_activity_resource_valid",
      sql`(${table.activityType} = 'restaurant' AND ${table.resourceType} IN ('category', 'dish')) OR (${table.activityType} = 'residence' AND ${table.resourceType} = 'residence')`,
    ),
  }),
);

// ============================================================================
// ENCAISSEMENTS DE COMMISSIONS (reçu de règlement groupé)
// ============================================================================

export const commissionSettlements = pgTable(
  "commission_settlements",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    partnerAccountId: uuid("partner_account_id")
      .notNull()
      .references(() => partnerAccounts.id, { onDelete: "restrict" }),
    adminId: varchar("admin_id", { length: 36 })
      .references(() => users.id, { onDelete: "restrict" }),
    source: commissionSettlementSourceEnum("source").notNull(),
    statut: commissionSettlementStatusEnum("statut")
      .notNull()
      .default("confirmed"),
    montantFcfa: integer("montant_fcfa").notNull(),
    moyenReglement: moyenReglementEnum("moyen_reglement"),
    referenceExterne: varchar("reference_externe", { length: 255 }).notNull(),
    justification: text("justification").notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    partnerIdx: index("commission_settlements_partner_idx").on(table.partnerAccountId),
    partnerPaidAtIdx: index("commission_settlements_partner_paid_at_idx").on(
      table.partnerAccountId,
      table.paidAt,
    ),
    referenceUnique: uniqueIndex("commission_settlements_source_reference_unique").on(
      table.source,
      table.referenceExterne,
    ),
    montantPositif: check(
      "commission_settlements_montant_positif",
      sql`${table.montantFcfa} > 0`,
    ),
    manualAdminCoherent: check(
      "commission_settlements_manual_admin_coherent",
      sql`${table.source} <> 'manual_admin' OR (${table.adminId} IS NOT NULL AND ${table.moyenReglement} IS NOT NULL AND ((${table.statut} = 'pending' AND ${table.confirmedAt} IS NULL) OR (${table.statut} = 'confirmed' AND ${table.confirmedAt} IS NOT NULL)))`,
    ),
  })
);

export const commissionPolicySettings = pgTable(
  "commission_policy_settings",
  {
    id: integer("id").primaryKey().default(1),
    cashDebtThresholdFcfa: integer("cash_debt_threshold_fcfa").notNull().default(10_000),
    cashGraceDays: integer("cash_grace_days").notNull().default(7),
    cashDebtRecoveryMaxBps: integer("cash_debt_recovery_max_bps").notNull().default(5_000),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    singleton: check("commission_policy_settings_singleton", sql`${table.id} = 1`),
    thresholdValid: check("commission_policy_settings_threshold_valid", sql`${table.cashDebtThresholdFcfa} >= 0`),
    graceValid: check("commission_policy_settings_grace_valid", sql`${table.cashGraceDays} >= 0`),
    recoveryValid: check("commission_policy_settings_recovery_valid", sql`${table.cashDebtRecoveryMaxBps} BETWEEN 0 AND 5000`),
  }),
);

export const commissionDebtCycles = pgTable(
  "commission_debt_cycles",
  {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    partnerAccountId: uuid("partner_account_id")
      .notNull()
      .references(() => partnerAccounts.id, { onDelete: "restrict" }),
    thresholdSnapshotFcfa: integer("threshold_snapshot_fcfa").notNull(),
    graceDaysSnapshot: integer("grace_days_snapshot").notNull(),
    triggeredAt: timestamp("triggered_at", { withTimezone: true }).notNull(),
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().$defaultFn(() => new Date()),
  },
  (table) => ({
    partnerIdx: index("commission_debt_cycles_partner_idx").on(table.partnerAccountId),
    oneActivePerPartner: uniqueIndex("commission_debt_cycles_one_active_per_partner")
      .on(table.partnerAccountId)
      .where(sql`${table.closedAt} IS NULL`),
    snapshotsValid: check("commission_debt_cycles_snapshots_valid", sql`${table.thresholdSnapshotFcfa} >= 0 AND ${table.graceDaysSnapshot} >= 0`),
    closureValid: check("commission_debt_cycles_closure_valid", sql`${table.closedAt} IS NULL OR ${table.closedAt} >= ${table.triggeredAt}`),
  }),
);

// ============================================================================
// CRENEAUX HORAIRES
// ============================================================================

export const creneauxHoraires = pgTable(
  "creneaux_horaires",
  {
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
  },
  (table) => ({
    restaurantIdx: index("idx_creneaux_horaires_restaurant").on(
      table.restaurantId
    ),
    restaurantNomIdx: index("idx_creneaux_horaires_restaurant_nom").on(
      table.restaurantId,
      table.nom
    ),
  })
);

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
    publicationIntent: boolean("publication_intent").notNull().default(true),
    firstPublishedAt: timestamp("first_published_at", { withTimezone: true }),
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
    restaurantPublicationIdx: index("idx_categories_restaurant_publication").on(
      table.restaurantId,
      table.publicationIntent
    ),
    quotaOrderIdx: index("idx_categories_quota_order").on(
      table.restaurantId,
      table.firstPublishedAt,
      table.createdAt,
      table.id,
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
    // Prix en FCFA entiers.
    prix: integer("prix").notNull(),
    photoUrl: text("photo_url"),
    disponible: boolean("disponible").notNull().default(true),
    publicationIntent: boolean("publication_intent").notNull().default(true),
    firstPublishedAt: timestamp("first_published_at", { withTimezone: true }),
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
    restaurantDisponibleIdx: index("idx_plats_restaurant_disponible").on(
      table.restaurantId,
      table.disponible
    ),
    quotaOrderIdx: index("idx_plats_quota_order").on(
      table.restaurantId,
      table.categorieId,
      table.firstPublishedAt,
      table.createdAt,
      table.id,
    ),
    nomIdx: index("idx_plats_nom").on(table.nom),
    restaurantNomIdx: index("idx_plats_restaurant_nom").on(
      table.restaurantId,
      table.nom
    ),
    prixPositif: check("plats_prix_positif", sql`${table.prix} > 0`),
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
    totalDepense: integer("total_depense").notNull().default(0), // FCFA entiers
    // Auth
    emailVerifie: boolean("email_verifie").notNull().default(false),
    actif: boolean("actif").notNull().default(true),
    motifSuspension: text("motif_suspension"),
    suspenduAt: timestamp("suspendu_at", { withTimezone: true }),
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
    totalDepenseNonNegatif: check(
      "clients_total_depense_non_negatif",
      sql`${table.totalDepense} >= 0`,
    ),
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
    idempotencyKey: varchar("idempotency_key", { length: 64 }),
    idempotencyRequestHash: varchar("idempotency_request_hash", { length: 64 }),
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
    serviceMarketId: uuid("service_market_id").references(
      () => serviceMarkets.id,
      { onDelete: "restrict" },
    ),
    serviceMarketVersionId: uuid("service_market_version_id").references(
      () => serviceMarketVersions.id,
      { onDelete: "restrict" },
    ),
    clientLocationCapturedAt: timestamp("client_location_captured_at", {
      withTimezone: true,
    }),
    clientLocationAccuracyM: real("client_location_accuracy_m"),
    geoPolicyVersion: varchar("geo_policy_version", { length: 50 }),
    // Articles (snapshot au moment de la commande)
    items: jsonb("items").notNull().$type<CommandeItemDB[]>(),
    // Montants en FCFA entiers.
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
    clientIdempotencyIdx: uniqueIndex("idx_commandes_client_idempotency").on(
      table.clientId,
      table.idempotencyKey
    ),
    serviceMarketIdx: index("commandes_service_market_idx").on(
      table.serviceMarketId,
      table.createdAt,
    ),
    livraisonLocationCoherent: check(
      "commandes_livraison_location_coherent",
      sql`${table.modeCommande} <> 'livraison' OR (${table.adresseLivraison} IS NOT NULL AND ${table.latitudeLivraison} IS NOT NULL AND ${table.longitudeLivraison} IS NOT NULL)`,
    ),
    statutIdx:      index("idx_commandes_statut").on(table.statut),
    createdAtIdx:   index("idx_commandes_created_at").on(table.createdAt),
    restaurantStatutIdx: index("idx_commandes_restaurant_statut").on(
      table.restaurantId,
      table.statut
    ),
    restaurantCreatedAtIdx: index("idx_commandes_restaurant_created_at").on(
      table.restaurantId,
      table.createdAt
    ),
    montantsNonNegatifs: check(
      "commandes_montants_non_negatifs",
      sql`${table.sousTotal} >= 0 AND ${table.fraisLivraison} >= 0 AND ${table.remise} >= 0 AND ${table.total} >= 0`,
    ),
    totalCoherent: check(
      "commandes_total_coherent",
      sql`${table.total} = ${table.sousTotal} + ${table.fraisLivraison} - ${table.remise}`,
    ),
  })
);

// ============================================================================
// TRANSACTIONS FINANCIÈRES ET TENTATIVES DE PAIEMENT
// ============================================================================

export const financialTransactions = pgTable(
  "transactions",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    type: transactionTypeEnum("type").notNull(),
    status: transactionStatusEnum("status").notNull().default("pending"),
    partnerAccountId: uuid("partner_account_id")
      .notNull()
      .references(() => partnerAccounts.id, { onDelete: "restrict" }),
    clientId: varchar("client_id", { length: 36 }).references(() => clients.id, {
      onDelete: "restrict",
    }),
    amountFcfa: integer("amount_fcfa").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("XOF"),
    restaurantOrderId: varchar("restaurant_order_id", { length: 36 }).references(
      () => commandes.id,
      { onDelete: "restrict" },
    ),
    subscriptionRequestId: varchar("subscription_request_id", { length: 36 }).references(
      () => subscriptionRequests.id,
      { onDelete: "restrict" },
    ),
    commissionSettlementId: varchar("commission_settlement_id", { length: 36 }).references(
      () => commissionSettlements.id,
      { onDelete: "restrict" },
    ),
    residenceReservationId: uuid("residence_reservation_id").references(
      () => residenceReservations.id,
      { onDelete: "restrict" },
    ),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    typeStatusIdx: index("transactions_type_status_idx").on(table.type, table.status),
    partnerStatusIdx: index("transactions_partner_status_idx").on(
      table.partnerAccountId,
      table.status,
    ),
    restaurantOrderUnique: uniqueIndex("transactions_restaurant_order_unique")
      .on(table.restaurantOrderId)
      .where(sql`${table.restaurantOrderId} IS NOT NULL`),
    subscriptionRequestUnique: uniqueIndex("transactions_subscription_request_unique")
      .on(table.subscriptionRequestId)
      .where(sql`${table.subscriptionRequestId} IS NOT NULL`),
    commissionSettlementUnique: uniqueIndex("transactions_commission_settlement_unique")
      .on(table.commissionSettlementId)
      .where(sql`${table.commissionSettlementId} IS NOT NULL`),
    residenceReservationUnique: uniqueIndex(
      "transactions_residence_reservation_unique",
    )
      .on(table.residenceReservationId)
      .where(sql`${table.residenceReservationId} IS NOT NULL`),
    amountPositive: check(
      "transactions_amount_positive",
      sql`${table.amountFcfa} > 0`,
    ),
    currencyXof: check("transactions_currency_xof", sql`${table.currency} = 'XOF'`),
    sourceCoherent: check(
      "transactions_source_coherent",
      sql`(${table.type} = 'commande_restaurant' AND ${table.restaurantOrderId} IS NOT NULL AND ${table.subscriptionRequestId} IS NULL AND ${table.commissionSettlementId} IS NULL AND ${table.residenceReservationId} IS NULL)
        OR (${table.type} = 'abonnement_partenaire' AND ${table.restaurantOrderId} IS NULL AND ${table.subscriptionRequestId} IS NOT NULL AND ${table.commissionSettlementId} IS NULL AND ${table.residenceReservationId} IS NULL)
        OR (${table.type} = 'commission_settlement' AND ${table.restaurantOrderId} IS NULL AND ${table.subscriptionRequestId} IS NULL AND ${table.commissionSettlementId} IS NOT NULL AND ${table.residenceReservationId} IS NULL)
        OR (${table.type} = 'reservation_residence' AND ${table.restaurantOrderId} IS NULL AND ${table.subscriptionRequestId} IS NULL AND ${table.commissionSettlementId} IS NULL AND ${table.residenceReservationId} IS NOT NULL)`,
    ),
    lifecycleCoherent: check(
      "transactions_lifecycle_coherent",
      sql`(${table.status} = 'pending' AND ${table.paidAt} IS NULL AND ${table.cancelledAt} IS NULL)
        OR (${table.status} = 'paid' AND ${table.paidAt} IS NOT NULL AND ${table.cancelledAt} IS NULL)
        OR (${table.status} = 'cancelled' AND ${table.paidAt} IS NULL AND ${table.cancelledAt} IS NOT NULL)`,
    ),
  })
);

export const payments = pgTable(
  "payments",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    transactionId: varchar("transaction_id", { length: 36 })
      .notNull()
      .references(() => financialTransactions.id, { onDelete: "restrict" }),
    provider: varchar("provider", { length: 50 }),
    method: paymentMethodEnum("method").notNull(),
    network: paymentNetworkEnum("network"),
    status: paymentStatusEnum("status").notNull().default("pending"),
    amountFcfa: integer("amount_fcfa").notNull(),
    providerReference: varchar("provider_reference", { length: 255 }),
    checkoutUrl: text("checkout_url"),
    returnChannel: varchar("return_channel", { length: 10 })
      .$type<PaymentReturnChannel>()
      .notNull()
      .default("web"),
    recoverySettlementId: varchar("recovery_settlement_id", { length: 36 }).references(
      () => commissionSettlements.id,
      { onDelete: "restrict" },
    ),
    idempotencyKey: varchar("idempotency_key", { length: 128 }),
    confirmedByAdminId: varchar("confirmed_by_admin_id", { length: 36 }).references(
      () => users.id,
      { onDelete: "restrict" },
    ),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    transactionIdx: index("payments_transaction_idx").on(table.transactionId),
    statusIdx: index("payments_status_idx").on(table.status),
    providerReferenceUnique: uniqueIndex("payments_provider_reference_unique")
      .on(table.provider, table.providerReference)
      .where(sql`${table.provider} IS NOT NULL AND ${table.providerReference} IS NOT NULL`),
    returnChannelCheck: check(
      "payments_return_channel_check",
      sql`${table.returnChannel} IN ('web', 'mobile')`,
    ),
    idempotencyUnique: uniqueIndex("payments_transaction_idempotency_unique")
      .on(table.transactionId, table.idempotencyKey)
      .where(sql`${table.idempotencyKey} IS NOT NULL`),
    recoverySettlementUnique: uniqueIndex("payments_recovery_settlement_unique")
      .on(table.recoverySettlementId)
      .where(sql`${table.recoverySettlementId} IS NOT NULL`),
    amountPositive: check("payments_amount_positive", sql`${table.amountFcfa} > 0`),
    providerReferenceCoherent: check(
      "payments_provider_reference_coherent",
      sql`${table.providerReference} IS NULL OR ${table.provider} IS NOT NULL`,
    ),
    cashProviderCoherent: check(
      "payments_cash_provider_coherent",
      sql`${table.method} <> 'cash' OR ${table.provider} IS NULL`,
    ),
    networkCoherent: check(
      "payments_network_coherent",
      sql`${table.network} IS NULL OR ${table.method} = 'mobile_money'`,
    ),
    lifecycleCoherent: check(
      "payments_lifecycle_coherent",
      sql`(${table.status} = 'pending' AND ${table.confirmedAt} IS NULL AND ${table.failedAt} IS NULL AND ${table.cancelledAt} IS NULL)
        OR (${table.status} = 'confirmed' AND ${table.confirmedAt} IS NOT NULL AND ${table.failedAt} IS NULL AND ${table.cancelledAt} IS NULL)
        OR (${table.status} = 'failed' AND ${table.confirmedAt} IS NULL AND ${table.failedAt} IS NOT NULL AND ${table.cancelledAt} IS NULL)
        OR (${table.status} = 'cancelled' AND ${table.confirmedAt} IS NULL AND ${table.failedAt} IS NULL AND ${table.cancelledAt} IS NOT NULL)`,
    ),
  }),
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
    photoUrl: text("photo_url"),
    vehicule: varchar("vehicule", { length: 50 }),    // "Moto", "Vélo", "Voiture"
    numeroVehicule: varchar("numero_vehicule", { length: 20 }),
    fixedDeliveryCompensationFcfa: integer(
      "fixed_delivery_compensation_fcfa",
    ),
    loginId: varchar("login_id", { length: 32 })
      .notNull()
      .$defaultFn(
        () => `LIV-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`,
      ),
    passwordHash: text("password_hash"),
    mustChangePassword: boolean("must_change_password").notNull().default(true),
    credentialsVersion: integer("credentials_version").notNull().default(0),
    credentialsIssuedAt: timestamp("credentials_issued_at", { withTimezone: true }),
    temporaryPasswordExpiresAt: timestamp("temporary_password_expires_at", {
      withTimezone: true,
    }),
    passwordChangedAt: timestamp("password_changed_at", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    deactivatedAt: timestamp("deactivated_at", { withTimezone: true }),
    deactivatedByUserId: varchar("deactivated_by_user_id", { length: 36 }).references(
      () => users.id,
      { onDelete: "restrict" },
    ),
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
    loginIdUnique: uniqueIndex("livreurs_login_id_unique").on(table.loginId),
    restaurantAvailabilityIdx: index("livreurs_restaurant_availability_idx").on(
      table.restaurantId,
      table.actif,
      table.enLigne,
    ),
    credentialsVersionValid: check(
      "livreurs_credentials_version_valid",
      sql`${table.credentialsVersion} >= 0`,
    ),
    deactivationCoherent: check(
      "livreurs_deactivation_coherent",
      sql`(${table.actif} AND ${table.deactivatedAt} IS NULL) OR (NOT ${table.actif} AND ${table.deactivatedAt} IS NOT NULL)`,
    ),
    fixedDeliveryCompensationValid: check(
      "livreurs_fixed_delivery_compensation_valid",
      sql`${table.fixedDeliveryCompensationFcfa} IS NULL OR (${table.fixedDeliveryCompensationFcfa} > 0 AND ${table.fixedDeliveryCompensationFcfa} <= 1000000)`,
    ),
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
    failureReason: varchar("failure_reason", { length: 50 }),
    failureNote: text("failure_note"),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    proofCodeDigest: varchar("proof_code_digest", { length: 64 }),
    proofCodeNonce: varchar("proof_code_nonce", { length: 32 }),
    proofCodeIssuedAt: timestamp("proof_code_issued_at", { withTimezone: true }),
    proofVerifiedAt: timestamp("proof_verified_at", { withTimezone: true }),
    proofMethod: deliveryProofMethodEnum("proof_method"),
    proofVerifiedByClientId: varchar("proof_verified_by_client_id", { length: 36 }).references(
      () => clients.id,
      { onDelete: "restrict" },
    ),
    proofAttempts: integer("proof_attempts").notNull().default(0),
    cashCollectedAt: timestamp("cash_collected_at", { withTimezone: true }),
    cashCollectedAmountFcfa: integer("cash_collected_amount_fcfa"),
    driverCompensationAmountFcfa: integer(
      "driver_compensation_amount_fcfa",
    ),
    driverCompensationPaidAt: timestamp("driver_compensation_paid_at", {
      withTimezone: true,
    }),
    driverCompensationPaidByUserId: varchar(
      "driver_compensation_paid_by_user_id",
      { length: 36 },
    ).references(() => users.id, { onDelete: "restrict" }),
    driverCompensationPaymentNote: text("driver_compensation_payment_note"),
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
    activeDriverUnique: uniqueIndex("livraisons_active_driver_unique")
      .on(table.livreurId)
      .where(
        sql`${table.livreurId} IS NOT NULL AND ${table.statut} IN ('assignee', 'en_route')`,
      ),
    proofAttemptsValid: check(
      "livraisons_proof_attempts_valid",
      sql`${table.proofAttempts} >= 0 AND ${table.proofAttempts} <= 10`,
    ),
    cashAmountValid: check(
      "livraisons_cash_amount_valid",
      sql`${table.cashCollectedAmountFcfa} IS NULL OR ${table.cashCollectedAmountFcfa} > 0`,
    ),
    driverCompensationAmountValid: check(
      "livraisons_driver_compensation_amount_valid",
      sql`${table.driverCompensationAmountFcfa} IS NULL OR (${table.driverCompensationAmountFcfa} > 0 AND ${table.driverCompensationAmountFcfa} <= 1000000)`,
    ),
    driverCompensationPaymentCoherent: check(
      "livraisons_driver_compensation_payment_coherent",
      sql`(${table.driverCompensationPaidAt} IS NULL AND ${table.driverCompensationPaidByUserId} IS NULL AND ${table.driverCompensationPaymentNote} IS NULL)
        OR (${table.statut} = 'livree' AND ${table.driverCompensationAmountFcfa} IS NOT NULL AND ${table.driverCompensationPaidAt} IS NOT NULL AND ${table.driverCompensationPaidByUserId} IS NOT NULL)`,
    ),
    pendingDriverCompensationIdx: index(
      "livraisons_pending_driver_compensation_idx",
    )
      .on(table.livreurId, table.heureLivree)
      .where(
        sql`${table.statut} = 'livree' AND ${table.driverCompensationAmountFcfa} IS NOT NULL AND ${table.driverCompensationPaidAt} IS NULL`,
      ),
    proofIssueCoherent: check(
      "livraisons_proof_issue_coherent",
      sql`num_nonnulls(${table.proofCodeDigest}, ${table.proofCodeNonce}, ${table.proofCodeIssuedAt}) IN (0, 3)`,
    ),
  })
);

export const deliveryOffers = pgTable(
  "delivery_offers",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    deliveryId: varchar("delivery_id", { length: 36 })
      .notNull()
      .references(() => livraisons.id, { onDelete: "restrict" }),
    orderId: varchar("order_id", { length: 36 })
      .notNull()
      .references(() => commandes.id, { onDelete: "restrict" }),
    restaurantId: varchar("restaurant_id", { length: 36 })
      .notNull()
      .references(() => restaurants.id, { onDelete: "restrict" }),
    driverId: varchar("driver_id", { length: 36 })
      .notNull()
      .references(() => livreurs.id, { onDelete: "restrict" }),
    status: deliveryOfferStatusEnum("status").notNull().default("pending"),
    declineReason: varchar("decline_reason", { length: 50 }),
    declineNote: text("decline_note"),
    becomeUnavailable: boolean("become_unavailable").notNull().default(false),
    driverCompensationAmountFcfa: integer(
      "driver_compensation_amount_fcfa",
    ),
    createdByUserId: varchar("created_by_user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    pendingDeliveryUnique: uniqueIndex("delivery_offers_pending_delivery_unique")
      .on(table.deliveryId)
      .where(sql`${table.status} = 'pending'`),
    pendingDriverUnique: uniqueIndex("delivery_offers_pending_driver_unique")
      .on(table.driverId)
      .where(sql`${table.status} = 'pending'`),
    driverStatusIdx: index("delivery_offers_driver_status_idx").on(
      table.driverId,
      table.status,
      table.expiresAt,
    ),
    restaurantCreatedIdx: index("delivery_offers_restaurant_created_idx").on(
      table.restaurantId,
      table.createdAt,
    ),
    expiryValid: check(
      "delivery_offers_expiry_valid",
      sql`${table.expiresAt} > ${table.createdAt}`,
    ),
    responseCoherent: check(
      "delivery_offers_response_coherent",
      sql`(${table.status} = 'pending' AND ${table.respondedAt} IS NULL) OR (${table.status} <> 'pending' AND ${table.respondedAt} IS NOT NULL)`,
    ),
    driverCompensationAmountValid: check(
      "delivery_offers_driver_compensation_amount_valid",
      sql`${table.driverCompensationAmountFcfa} IS NULL OR (${table.driverCompensationAmountFcfa} > 0 AND ${table.driverCompensationAmountFcfa} <= 1000000)`,
    ),
  }),
);

export const deliveryEvents = pgTable(
  "delivery_events",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    deliveryId: varchar("delivery_id", { length: 36 }).references(
      () => livraisons.id,
      { onDelete: "restrict" },
    ),
    orderId: varchar("order_id", { length: 36 }).references(() => commandes.id, {
      onDelete: "restrict",
    }),
    restaurantId: varchar("restaurant_id", { length: 36 })
      .notNull()
      .references(() => restaurants.id, { onDelete: "restrict" }),
    driverId: varchar("driver_id", { length: 36 }).references(() => livreurs.id, {
      onDelete: "restrict",
    }),
    offerId: varchar("offer_id", { length: 36 }).references(
      () => deliveryOffers.id,
      { onDelete: "restrict" },
    ),
    eventType: deliveryEventTypeEnum("event_type").notNull(),
    actorType: deliveryActorTypeEnum("actor_type").notNull(),
    actorId: varchar("actor_id", { length: 36 }).notNull(),
    fromStatus: statutLivraisonEnum("from_status"),
    toStatus: statutLivraisonEnum("to_status"),
    metadata: jsonb("metadata")
      .notNull()
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    deliveryCreatedIdx: index("delivery_events_delivery_created_idx").on(
      table.deliveryId,
      table.createdAt,
    ),
    restaurantCreatedIdx: index("delivery_events_restaurant_created_idx").on(
      table.restaurantId,
      table.createdAt,
    ),
    driverCreatedIdx: index("delivery_events_driver_created_idx").on(
      table.driverId,
      table.createdAt,
    ),
  }),
);

export const driverCashRemittances = pgTable(
  "driver_cash_remittances",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    restaurantId: varchar("restaurant_id", { length: 36 })
      .notNull()
      .references(() => restaurants.id, { onDelete: "restrict" }),
    driverId: varchar("driver_id", { length: 36 })
      .notNull()
      .references(() => livreurs.id, { onDelete: "restrict" }),
    expectedAmountFcfa: integer("expected_amount_fcfa").notNull(),
    receivedAmountFcfa: integer("received_amount_fcfa").notNull(),
    confirmedByUserId: varchar("confirmed_by_user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    note: text("note"),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    driverConfirmedIdx: index("driver_cash_remittances_driver_confirmed_idx").on(
      table.driverId,
      table.confirmedAt,
    ),
    exactAmount: check(
      "driver_cash_remittances_exact_amount",
      sql`${table.expectedAmountFcfa} > 0 AND ${table.receivedAmountFcfa} = ${table.expectedAmountFcfa}`,
    ),
  }),
);

export const driverCashCollections = pgTable(
  "driver_cash_collections",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    deliveryId: varchar("delivery_id", { length: 36 })
      .notNull()
      .references(() => livraisons.id, { onDelete: "restrict" }),
    orderId: varchar("order_id", { length: 36 })
      .notNull()
      .references(() => commandes.id, { onDelete: "restrict" }),
    restaurantId: varchar("restaurant_id", { length: 36 })
      .notNull()
      .references(() => restaurants.id, { onDelete: "restrict" }),
    driverId: varchar("driver_id", { length: 36 })
      .notNull()
      .references(() => livreurs.id, { onDelete: "restrict" }),
    expectedAmountFcfa: integer("expected_amount_fcfa").notNull(),
    collectedAmountFcfa: integer("collected_amount_fcfa").notNull(),
    status: driverCashCollectionStatusEnum("status").notNull().default("held"),
    remittanceId: varchar("remittance_id", { length: 36 }).references(
      () => driverCashRemittances.id,
      { onDelete: "restrict" },
    ),
    collectedAt: timestamp("collected_at", { withTimezone: true }).notNull(),
    remittedAt: timestamp("remitted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    deliveryUnique: uniqueIndex("driver_cash_collections_delivery_unique").on(
      table.deliveryId,
    ),
    orderUnique: uniqueIndex("driver_cash_collections_order_unique").on(table.orderId),
    driverStatusIdx: index("driver_cash_collections_driver_status_idx").on(
      table.driverId,
      table.status,
      table.collectedAt,
    ),
    amountExact: check(
      "driver_cash_collections_amount_exact",
      sql`${table.expectedAmountFcfa} > 0 AND ${table.collectedAmountFcfa} = ${table.expectedAmountFcfa}`,
    ),
    lifecycleCoherent: check(
      "driver_cash_collections_lifecycle_coherent",
      sql`(${table.status} = 'held' AND ${table.remittanceId} IS NULL AND ${table.remittedAt} IS NULL) OR (${table.status} = 'remitted' AND ${table.remittanceId} IS NOT NULL AND ${table.remittedAt} IS NOT NULL)`,
    ),
  }),
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
    valeur: integer("valeur").notNull().default(0), // % ou montant fixe en FCFA entiers
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
    restaurantActifIdx: index("idx_promotions_restaurant_actif").on(
      table.restaurantId,
      table.actif
    ),
    valeurNonNegative: check(
      "promotions_valeur_non_negative",
      sql`${table.valeur} >= 0`,
    ),
    montantMinNonNegatif: check(
      "promotions_montant_min_commande_non_negatif",
      sql`${table.montantMinCommande} >= 0`,
    ),
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
    restaurantVisibleIdx: index("idx_avis_restaurant_visible").on(
      table.restaurantId,
      table.visible
    ),
    createdAtIdx: index("idx_avis_created_at").on(table.createdAt),
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
    driverId: varchar("driver_id", { length: 36 }).references(
      () => livreurs.id,
      { onDelete: "cascade" },
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
    driverIdx: index("idx_notifications_driver").on(table.driverId),
    lueIdx:     index("idx_notifications_lue").on(table.lue),
    userLueIdx: index("idx_notifications_user_lue").on(
      table.userId,
      table.lue
    ),
    createdAtIdx: index("idx_notifications_created_at").on(table.createdAt),
    singleOwner: check(
      "notifications_single_owner",
      sql`num_nonnulls(${table.userId}, ${table.clientId}, ${table.driverId}) = 1`,
    ),
  })
);

// ============================================================================
// TYPES AUXILIAIRES JSONB
// ============================================================================

export interface CommandeItemDB {
  platId: string;
  nom: string;
  prix: number;       // FCFA entiers, snapshot au moment de la commande
  quantite: number;
  totalLigne?: number; // présent sur toutes les nouvelles commandes (anciens JSON compatibles)
  note?: string;      // note spéciale pour ce plat
}

// ============================================================================
// AUDIT LOG  (traçabilité des actions admin)
// ============================================================================

export const auditActionEnum = pgEnum("audit_action", [
  "restaurant_valide",
  "restaurant_rejete",
  "restaurant_suspendu",
  "restaurant_reactive",
  "user_suspendu",
  "user_reactive",
  "client_suspendu",
  "client_reactive",
  "commission_modifiee",
  "abonnement_valide",
  "abonnement_refuse",
  "abonnement_suspendu",
  "abonnement_reactive",
  "abonnement_expire",
  "abonnement_regrade",
  "catalogue_modifie",
  "quota_catalogue_modifie",
  "commissions_encaissees",
  "politique_commission_modifiee",
  "provider_account_associe",
  "provider_account_desactive",
  "service_market_created",
  "service_market_version_created",
  "service_market_version_published",
  "service_market_capability_changed",
  "geo_source_areas_imported",
  "identity_verification_verified",
  "identity_verification_rejected",
  ...RESIDENCE_AUDIT_ACTIONS,
]);

export const auditLog = pgTable(
  "audit_log",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    // Qui a fait l'action
    adminId: varchar("admin_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),

    action: auditActionEnum("action").notNull(),

    // Sur quelle ressource (restaurant, user, client...)
    ressourceType: varchar("ressource_type", { length: 50 }).notNull(),
    ressourceId:   varchar("ressource_id", { length: 36 }).notNull(),

    // Détails de l'action (raison, anciennes/nouvelles valeurs)
    details: jsonb("details").$type<Record<string, unknown>>(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    adminIdx:      index("idx_audit_log_admin").on(table.adminId),
    ressourceIdx:  index("idx_audit_log_ressource").on(
      table.ressourceType,
      table.ressourceId
    ),
    createdAtIdx:  index("idx_audit_log_created_at").on(table.createdAt),
  })
);

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  admin: one(users, {
    fields:     [auditLog.adminId],
    references: [users.id],
  }),
}));

// ============================================================================
// COMMISSIONS  (calcul des montants dus par les restaurants)
// ============================================================================

export const commissions = pgTable(
  "commissions",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    commandeId: varchar("commande_id", { length: 36 })
      .references(() => commandes.id, { onDelete: "restrict" }),

    residenceReservationId: uuid("residence_reservation_id").references(
      () => residenceReservations.id,
      { onDelete: "restrict" },
    ),

    partnerAccountId: uuid("partner_account_id")
      .notNull()
      .references(() => partnerAccounts.id, { onDelete: "restrict" }),
    baseAmountFcfa: integer("base_amount_fcfa").notNull(),
    rateBpsSnapshot: integer("rate_bps_snapshot").notNull(),
    amountFcfa: integer("amount_fcfa").notNull(),
    commercialStatus: commissionCommercialStatusEnum("commercial_status")
      .notNull()
      .default("pending"),
    collectionMode: commissionCollectionModeEnum("collection_mode").notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }),
    voidedAt: timestamp("voided_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    partnerIdx: index("commissions_partner_idx").on(table.partnerAccountId),
    statusIdx: index("commissions_commercial_status_idx").on(table.commercialStatus),
    commandeUnique: uniqueIndex("commissions_commande_id_unique")
      .on(table.commandeId)
      .where(sql`${table.commandeId} IS NOT NULL`),
    residenceReservationUnique: uniqueIndex(
      "commissions_residence_reservation_unique",
    )
      .on(table.residenceReservationId)
      .where(sql`${table.residenceReservationId} IS NOT NULL`),
    partnerCashDueIdx: index("commissions_partner_cash_due_idx").on(
      table.partnerAccountId,
      table.dueAt,
      table.createdAt,
      table.id,
    ).where(sql`${table.commercialStatus} = 'due' AND ${table.collectionMode} = 'cash_receivable'`),
    amountsValid: check(
      "commissions_amounts_valid",
      sql`${table.baseAmountFcfa} >= 0 AND ${table.amountFcfa} >= 0 AND ${table.amountFcfa} <= ${table.baseAmountFcfa}`,
    ),
    rateValid: check(
      "commissions_rate_valid",
      sql`${table.rateBpsSnapshot} BETWEEN 0 AND 10000`,
    ),
    lifecycleValid: check(
      "commissions_lifecycle_valid",
      sql`(${table.commercialStatus} = 'pending' AND ${table.dueAt} IS NULL AND ${table.voidedAt} IS NULL) OR (${table.commercialStatus} = 'due' AND ${table.dueAt} IS NOT NULL AND ${table.voidedAt} IS NULL) OR (${table.commercialStatus} = 'void' AND ${table.dueAt} IS NULL AND ${table.voidedAt} IS NOT NULL)`,
    ),
    sourceValid: check(
      "commissions_source_valid",
      sql`(${table.commandeId} IS NOT NULL AND ${table.residenceReservationId} IS NULL) OR (${table.commandeId} IS NULL AND ${table.residenceReservationId} IS NOT NULL)`,
    ),
  })
);

export const commissionSettlementAllocations = pgTable(
  "commission_settlement_allocations",
  {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    settlementId: varchar("settlement_id", { length: 36 })
      .notNull()
      .references(() => commissionSettlements.id, { onDelete: "restrict" }),
    commissionId: varchar("commission_id", { length: 36 })
      .notNull()
      .references(() => commissions.id, { onDelete: "restrict" }),
    amountFcfa: integer("amount_fcfa").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().$defaultFn(() => new Date()),
  },
  (table) => ({
    settlementCommissionUnique: uniqueIndex("commission_allocations_settlement_commission_unique").on(
      table.settlementId,
      table.commissionId,
    ),
    commissionIdx: index("commission_allocations_commission_idx").on(table.commissionId),
    settlementIdx: index("commission_allocations_settlement_idx").on(table.settlementId),
    amountPositive: check("commission_allocations_amount_positive", sql`${table.amountFcfa} > 0`),
  }),
);

export const commissionsRelations = relations(commissions, ({ one }) => ({
  commande: one(commandes, {
    fields:     [commissions.commandeId],
    references: [commandes.id],
  }),
  partnerAccount: one(partnerAccounts, {
    fields: [commissions.partnerAccountId],
    references: [partnerAccounts.id],
  }),
  residenceReservation: one(residenceReservations, {
    fields: [commissions.residenceReservationId],
    references: [residenceReservations.id],
  }),
}));

export const commissionSettlementAllocationsRelations = relations(
  commissionSettlementAllocations,
  ({ one }) => ({
    settlement: one(commissionSettlements, {
      fields: [commissionSettlementAllocations.settlementId],
      references: [commissionSettlements.id],
    }),
    commission: one(commissions, {
      fields: [commissionSettlementAllocations.commissionId],
      references: [commissions.id],
    }),
  }),
);

// ============================================================================
// RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ one, many }) => ({
  partnerAccount: one(partnerAccounts, {
    fields: [users.id],
    references: [partnerAccounts.userId],
  }),
  notifications: many(notifications),
  adminSubscriptionPlanUpdates: many(subscriptionPlans),
}));

export const partnerAccountsRelations = relations(partnerAccounts, ({ one, many }) => ({
  user: one(users, {
    fields: [partnerAccounts.userId],
    references: [users.id],
  }),
  restaurant: one(restaurants, {
    fields: [partnerAccounts.id],
    references: [restaurants.partnerAccountId],
  }),
  residences: many(residences),
  subscriptionPeriods: many(subscriptionPeriods),
  subscriptionRequests: many(subscriptionRequests),
  commissions: many(commissions),
  commissionSettlements: many(commissionSettlements),
  commissionDebtCycles: many(commissionDebtCycles),
  paymentProviderAccounts: many(paymentProviderAccounts),
  identityVerification: one(partnerIdentityVerifications, {
    fields: [partnerAccounts.id],
    references: [partnerIdentityVerifications.partnerAccountId],
  }),
}));

export const partnerIdentityVerificationsRelations = relations(
  partnerIdentityVerifications,
  ({ one, many }) => ({
    partnerAccount: one(partnerAccounts, {
      fields: [partnerIdentityVerifications.partnerAccountId],
      references: [partnerAccounts.id],
    }),
    reviewedByAdmin: one(users, {
      fields: [partnerIdentityVerifications.reviewedByAdminId],
      references: [users.id],
    }),
    documents: many(partnerIdentityDocuments),
  }),
);

export const partnerIdentityDocumentsRelations = relations(
  partnerIdentityDocuments,
  ({ one }) => ({
    verification: one(partnerIdentityVerifications, {
      fields: [partnerIdentityDocuments.verificationId],
      references: [partnerIdentityVerifications.id],
    }),
  }),
);

export const paymentProviderAccountsRelations = relations(paymentProviderAccounts, ({ one }) => ({
  partnerAccount: one(partnerAccounts, {
    fields: [paymentProviderAccounts.partnerAccountId],
    references: [partnerAccounts.id],
  }),
  linkedByAdmin: one(users, {
    fields: [paymentProviderAccounts.linkedByAdminId],
    references: [users.id],
  }),
}));

export const serviceMarketsRelations = relations(
  serviceMarkets,
  ({ one, many }) => ({
    activeVersion: one(serviceMarketVersions, {
      fields: [serviceMarkets.activeVersionId],
      references: [serviceMarketVersions.id],
    }),
    versions: many(serviceMarketVersions),
    capabilities: many(serviceMarketCapabilities),
    restaurants: many(restaurants),
    commandes: many(commandes),
  }),
);

export const serviceMarketVersionsRelations = relations(
  serviceMarketVersions,
  ({ one, many }) => ({
    market: one(serviceMarkets, {
      fields: [serviceMarketVersions.serviceMarketId],
      references: [serviceMarkets.id],
    }),
    createdBy: one(users, {
      fields: [serviceMarketVersions.createdByUserId],
      references: [users.id],
    }),
    areas: many(serviceMarketVersionAreas),
    assignedRestaurants: many(restaurants),
    commandes: many(commandes),
  }),
);

export const serviceMarketCapabilitiesRelations = relations(
  serviceMarketCapabilities,
  ({ one }) => ({
    market: one(serviceMarkets, {
      fields: [serviceMarketCapabilities.serviceMarketId],
      references: [serviceMarkets.id],
    }),
  }),
);

export const geoSourceAreasRelations = relations(geoSourceAreas, ({ many }) => ({
  versionAreas: many(serviceMarketVersionAreas),
}));

export const serviceMarketVersionAreasRelations = relations(
  serviceMarketVersionAreas,
  ({ one }) => ({
    version: one(serviceMarketVersions, {
      fields: [serviceMarketVersionAreas.serviceMarketVersionId],
      references: [serviceMarketVersions.id],
    }),
    sourceArea: one(geoSourceAreas, {
      fields: [serviceMarketVersionAreas.geoSourceAreaId],
      references: [geoSourceAreas.id],
    }),
  }),
);

export const restaurantsRelations = relations(restaurants, ({ one, many }) => ({
  partnerAccount: one(partnerAccounts, {
    fields: [restaurants.partnerAccountId],
    references: [partnerAccounts.id],
  }),
  serviceMarket: one(serviceMarkets, {
    fields: [restaurants.serviceMarketId],
    references: [serviceMarkets.id],
  }),
  serviceMarketVersion: one(serviceMarketVersions, {
    fields: [restaurants.serviceMarketVersionId],
    references: [serviceMarketVersions.id],
  }),
  creneaux:    many(creneauxHoraires),
  categories:  many(categories),
  plats:       many(plats),
  commandes:   many(commandes),
  promotions:  many(promotions),
  avis:        many(avis),
  livreurs:    many(livreurs),
}));

export const residencesRelations = relations(residences, ({ one, many }) => ({
  partnerAccount: one(partnerAccounts, {
    fields: [residences.partnerAccountId],
    references: [partnerAccounts.id],
  }),
  images: many(residenceImages),
  reservations: many(residenceReservations),
  unavailablePeriods: many(residenceUnavailablePeriods),
}));

export const residenceImagesRelations = relations(residenceImages, ({ one }) => ({
  residence: one(residences, {
    fields: [residenceImages.residenceId],
    references: [residences.id],
  }),
}));

export const subscriptionPlansRelations = relations(subscriptionPlans, ({ one, many }) => ({
  updatedBy: one(users, {
    fields: [subscriptionPlans.updatedByAdminId],
    references: [users.id],
  }),
  limits: many(subscriptionPlanLimits),
  exposureBenefits: many(subscriptionPlanExposureBenefits),
  featureItems: many(subscriptionPlanFeatureItems),
}));

export const subscriptionPlanLimitsRelations = relations(subscriptionPlanLimits, ({ one }) => ({
  plan: one(subscriptionPlans, {
    fields: [subscriptionPlanLimits.planId],
    references: [subscriptionPlans.id],
  }),
}));

export const subscriptionPlanExposureBenefitsRelations = relations(
  subscriptionPlanExposureBenefits,
  ({ one }) => ({
    plan: one(subscriptionPlans, {
      fields: [subscriptionPlanExposureBenefits.planId],
      references: [subscriptionPlans.id],
    }),
  }),
);

export const subscriptionPlanFeatureItemsRelations = relations(
  subscriptionPlanFeatureItems,
  ({ one }) => ({
    plan: one(subscriptionPlans, {
      fields: [subscriptionPlanFeatureItems.planId],
      references: [subscriptionPlans.id],
    }),
  }),
);

export const subscriptionRequestsRelations = relations(subscriptionRequests, ({ one, many }) => ({
  partnerAccount: one(partnerAccounts, {
    fields: [subscriptionRequests.partnerAccountId],
    references: [partnerAccounts.id],
  }),
  traiteeParAdmin: one(users, {
    fields: [subscriptionRequests.traiteeParAdminId],
    references: [users.id],
  }),
  periods: many(subscriptionPeriods),
}));

export const subscriptionPeriodsRelations = relations(subscriptionPeriods, ({ one, many }) => ({
  partnerAccount: one(partnerAccounts, {
    fields: [subscriptionPeriods.partnerAccountId],
    references: [partnerAccounts.id],
  }),
  request: one(subscriptionRequests, {
    fields: [subscriptionPeriods.requestId],
    references: [subscriptionRequests.id],
  }),
  valideeParAdmin: one(users, {
    fields: [subscriptionPeriods.valideeParAdminId],
    references: [users.id],
  }),
  suspenduParAdmin: one(users, {
    fields: [subscriptionPeriods.suspenduParAdminId],
    references: [users.id],
  }),
  limits: many(subscriptionPeriodLimits),
}));

export const subscriptionPeriodLimitsRelations = relations(subscriptionPeriodLimits, ({ one }) => ({
  period: one(subscriptionPeriods, {
    fields: [subscriptionPeriodLimits.subscriptionPeriodId],
    references: [subscriptionPeriods.id],
  }),
}));

export const commissionSettlementsRelations = relations(commissionSettlements, ({ one, many }) => ({
  partnerAccount: one(partnerAccounts, {
    fields: [commissionSettlements.partnerAccountId],
    references: [partnerAccounts.id],
  }),
  admin: one(users, {
    fields: [commissionSettlements.adminId],
    references: [users.id],
  }),
  allocations: many(commissionSettlementAllocations),
}));

export const commissionDebtCyclesRelations = relations(commissionDebtCycles, ({ one }) => ({
  partnerAccount: one(partnerAccounts, {
    fields: [commissionDebtCycles.partnerAccountId],
    references: [partnerAccounts.id],
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
  pushSubscriptions: many(pushSubscriptions),
  residenceReservations: many(residenceReservations),
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
  serviceMarket: one(serviceMarkets, {
    fields: [commandes.serviceMarketId],
    references: [serviceMarkets.id],
  }),
  serviceMarketVersion: one(serviceMarketVersions, {
    fields: [commandes.serviceMarketVersionId],
    references: [serviceMarketVersions.id],
  }),
  financialTransaction: one(financialTransactions, {
    fields: [commandes.id],
    references: [financialTransactions.restaurantOrderId],
  }),
  livraison: one(livraisons, {
    fields: [commandes.id],
    references: [livraisons.commandeId],
  }),
  avis: one(avis, {
    fields: [commandes.id],
    references: [avis.commandeId],
  }),
  commission: one(commissions, {
    fields: [commandes.id],
    references: [commissions.commandeId],
  }),
}));

export const financialTransactionsRelations = relations(
  financialTransactions,
  ({ one, many }) => ({
    partnerAccount: one(partnerAccounts, {
      fields: [financialTransactions.partnerAccountId],
      references: [partnerAccounts.id],
    }),
    client: one(clients, {
      fields: [financialTransactions.clientId],
      references: [clients.id],
    }),
    restaurantOrder: one(commandes, {
      fields: [financialTransactions.restaurantOrderId],
      references: [commandes.id],
    }),
    subscriptionRequest: one(subscriptionRequests, {
      fields: [financialTransactions.subscriptionRequestId],
      references: [subscriptionRequests.id],
    }),
    commissionSettlement: one(commissionSettlements, {
      fields: [financialTransactions.commissionSettlementId],
      references: [commissionSettlements.id],
    }),
    residenceReservation: one(residenceReservations, {
      fields: [financialTransactions.residenceReservationId],
      references: [residenceReservations.id],
    }),
    payments: many(payments),
  }),
);

export const residenceReservationsRelations = relations(
  residenceReservations,
  ({ one }) => ({
    residence: one(residences, {
      fields: [residenceReservations.residenceId],
      references: [residences.id],
    }),
    partnerAccount: one(partnerAccounts, {
      fields: [residenceReservations.partnerAccountId],
      references: [partnerAccounts.id],
    }),
    client: one(clients, {
      fields: [residenceReservations.clientId],
      references: [clients.id],
    }),
    financialTransaction: one(financialTransactions, {
      fields: [residenceReservations.id],
      references: [financialTransactions.residenceReservationId],
    }),
    commission: one(commissions, {
      fields: [residenceReservations.id],
      references: [commissions.residenceReservationId],
    }),
  }),
);

export const residenceUnavailablePeriodsRelations = relations(
  residenceUnavailablePeriods,
  ({ one }) => ({
    residence: one(residences, {
      fields: [residenceUnavailablePeriods.residenceId],
      references: [residences.id],
    }),
  }),
);

export const paymentsRelations = relations(payments, ({ one }) => ({
  transaction: one(financialTransactions, {
    fields: [payments.transactionId],
    references: [financialTransactions.id],
  }),
  confirmedByAdmin: one(users, {
    fields: [payments.confirmedByAdminId],
    references: [users.id],
  }),
  recoverySettlement: one(commissionSettlements, {
    fields: [payments.recoverySettlementId],
    references: [commissionSettlements.id],
  }),
}));

export const livreursRelations = relations(livreurs, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [livreurs.restaurantId],
    references: [restaurants.id],
  }),
  deactivatedByUser: one(users, {
    fields: [livreurs.deactivatedByUserId],
    references: [users.id],
  }),
  livraisons: many(livraisons),
  offers: many(deliveryOffers),
  events: many(deliveryEvents),
  cashCollections: many(driverCashCollections),
  cashRemittances: many(driverCashRemittances),
  notifications: many(notifications),
  pushSubscriptions: many(pushSubscriptions),
}));

export const livraisonsRelations = relations(livraisons, ({ one, many }) => ({
  commande: one(commandes, {
    fields: [livraisons.commandeId],
    references: [commandes.id],
  }),
  livreur: one(livreurs, {
    fields: [livraisons.livreurId],
    references: [livreurs.id],
  }),
  proofVerifiedByClient: one(clients, {
    fields: [livraisons.proofVerifiedByClientId],
    references: [clients.id],
  }),
  driverCompensationPaidByUser: one(users, {
    fields: [livraisons.driverCompensationPaidByUserId],
    references: [users.id],
    relationName: "deliveryCompensationPaidBy",
  }),
  offers: many(deliveryOffers),
  events: many(deliveryEvents),
  cashCollection: one(driverCashCollections, {
    fields: [livraisons.id],
    references: [driverCashCollections.deliveryId],
  }),
}));

export const deliveryOffersRelations = relations(deliveryOffers, ({ one, many }) => ({
  delivery: one(livraisons, {
    fields: [deliveryOffers.deliveryId],
    references: [livraisons.id],
  }),
  order: one(commandes, {
    fields: [deliveryOffers.orderId],
    references: [commandes.id],
  }),
  restaurant: one(restaurants, {
    fields: [deliveryOffers.restaurantId],
    references: [restaurants.id],
  }),
  driver: one(livreurs, {
    fields: [deliveryOffers.driverId],
    references: [livreurs.id],
  }),
  createdByUser: one(users, {
    fields: [deliveryOffers.createdByUserId],
    references: [users.id],
  }),
  events: many(deliveryEvents),
}));

export const deliveryEventsRelations = relations(deliveryEvents, ({ one }) => ({
  delivery: one(livraisons, {
    fields: [deliveryEvents.deliveryId],
    references: [livraisons.id],
  }),
  order: one(commandes, {
    fields: [deliveryEvents.orderId],
    references: [commandes.id],
  }),
  restaurant: one(restaurants, {
    fields: [deliveryEvents.restaurantId],
    references: [restaurants.id],
  }),
  driver: one(livreurs, {
    fields: [deliveryEvents.driverId],
    references: [livreurs.id],
  }),
  offer: one(deliveryOffers, {
    fields: [deliveryEvents.offerId],
    references: [deliveryOffers.id],
  }),
}));

export const driverCashRemittancesRelations = relations(
  driverCashRemittances,
  ({ one, many }) => ({
    restaurant: one(restaurants, {
      fields: [driverCashRemittances.restaurantId],
      references: [restaurants.id],
    }),
    driver: one(livreurs, {
      fields: [driverCashRemittances.driverId],
      references: [livreurs.id],
    }),
    confirmedByUser: one(users, {
      fields: [driverCashRemittances.confirmedByUserId],
      references: [users.id],
    }),
    collections: many(driverCashCollections),
  }),
);

export const driverCashCollectionsRelations = relations(
  driverCashCollections,
  ({ one }) => ({
    delivery: one(livraisons, {
      fields: [driverCashCollections.deliveryId],
      references: [livraisons.id],
    }),
    order: one(commandes, {
      fields: [driverCashCollections.orderId],
      references: [commandes.id],
    }),
    restaurant: one(restaurants, {
      fields: [driverCashCollections.restaurantId],
      references: [restaurants.id],
    }),
    driver: one(livreurs, {
      fields: [driverCashCollections.driverId],
      references: [livreurs.id],
    }),
    remittance: one(driverCashRemittances, {
      fields: [driverCashCollections.remittanceId],
      references: [driverCashRemittances.id],
    }),
  }),
);

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
  driver: one(livreurs, {
    fields: [notifications.driverId],
    references: [livreurs.id],
  }),
}));

// ============================================================================
// PUSH SUBSCRIPTIONS (Web Push & Expo Push)
// ============================================================================

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    userId: varchar("user_id", { length: 36 }).references(() => users.id, {
      onDelete: "cascade",
    }),

    clientId: varchar("client_id", { length: 36 }).references(() => clients.id, {
      onDelete: "cascade",
    }),

    driverId: varchar("driver_id", { length: 36 }).references(() => livreurs.id, {
      onDelete: "cascade",
    }),

    type: varchar("type", { length: 20 })
      .notNull()
      .$type<"web" | "expo">(),

    endpoint:   text("endpoint"),
    p256dh:     text("p256dh"),
    auth:       text("auth"),
    expoToken:  text("expo_token"),

    userAgent:  text("user_agent"),
    createdAt:  timestamp("created_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  },
  (table) => ({
    userIdx:     index("idx_push_subscriptions_user").on(table.userId),
    clientIdx:   index("idx_push_subscriptions_client").on(table.clientId),
    driverIdx: index("idx_push_subscriptions_driver").on(table.driverId),
    typeIdx:     index("idx_push_subscriptions_type").on(table.type),
    endpointIdx: index("idx_push_subscriptions_endpoint").on(table.endpoint),
    expoTokenUnique: uniqueIndex("push_subscriptions_expo_token_unique")
      .on(table.expoToken)
      .where(sql`${table.expoToken} IS NOT NULL`),
    singleOwner: check(
      "push_subscriptions_single_owner",
      sql`num_nonnulls(${table.userId}, ${table.clientId}, ${table.driverId}) = 1`,
    ),
  })
);

export const pushSubscriptionsRelations = relations(pushSubscriptions, ({ one }) => ({
  user: one(users, {
    fields:     [pushSubscriptions.userId],
    references: [users.id],
  }),
  client: one(clients, {
    fields: [pushSubscriptions.clientId],
    references: [clients.id],
  }),
  driver: one(livreurs, {
    fields: [pushSubscriptions.driverId],
    references: [livreurs.id],
  }),
}));
