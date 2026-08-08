import { db } from "./index";
import { eq, and, isNotNull, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import {
  cacheKey,
  invalidateCache,
  invalidateRestaurantCache,
} from "@/lib/cache";
import {
  users,
  restaurants,
  categories,
  plats,
  creneauxHoraires,
  clients,
  paiements,
  livraisons,
  livreurs,
  promotions,
  avis,
  notifications,
  subscriptionRequests,
  subscriptionPeriods,
} from "./schema";
import { getInitialMenuCategories } from "@/lib/menu/default-categories";
import {
  checkPlanLimits,
  SubscriptionLimitError,
} from "@/lib/subscription-plans";
export { createCommande, updateStatutCommande } from "./commandes-mutations";
export type { CreateCommandeInput } from "./commandes-mutations";

// ============================================================================
// HELPERS
// ============================================================================

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .trim();
}

// ============================================================================
// USERS
// ============================================================================

export interface CreateUserInput {
  nom: string;
  email: string;
  passwordHash: string;
  telephone: string;
  role?: "restaurateur" | "admin";
}

export async function createUser(input: CreateUserInput) {
  const [user] = await db
    .insert(users)
    .values({
      nom: input.nom,
      email: input.email,
      password: input.passwordHash,
      telephone: input.telephone,
      role: input.role ?? "restaurateur",
    })
    .returning();
  return user;
}

export async function updateUser(
  id: string,
  data: Partial<{
    nom: string;
    telephone: string;
    avatarUrl: string;
    emailVerifie: boolean;
    tokenVerifEmail: string | null;
    tokenResetPassword: string | null;
    tokenResetExpireAt: Date | null;
    dernierConnexion: Date;
  }>
) {
  const [user] = await db
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  return user;
}

// ============================================================================
// RESTAURANTS
// ============================================================================

export interface CreateRestaurantInput {
  userId: string;
  nom: string;
  description?: string;
  telephone: string;
  email?: string;
  siteWeb?: string;
  adresse: string;
  ville?: string;
  pays?: string;
  latitude: number;
  longitude: number;
  logoUrl?: string;
  banniereUrl?: string;
  fraisLivraison?: number;
  commandeMinimum?: number;
  modesCommande?: string[];
  cuisines?: string[];
  facebook?: string;
  instagram?: string;
  whatsapp?: string;
  schedule?: {
    nom: string;
    heureOuverture: string;
    heureFermeture: string;
    joursActifs: string[];
  }[];
  menu?: {
    nom: string;
    description?: string;
    prix: number;
    categorie: string;
    photoUrl?: string;
  }[];
}

export async function createRestaurant(input: CreateRestaurantInput) {
  let slug = slugify(input.nom);

  // Unicité du slug
  const existing = await db.query.restaurants.findFirst({
    where: (r, { eq }) => eq(r.slug, slug),
  });
  if (existing) slug = `${slug}-${Date.now()}`;

  // L'offre choisie à l'inscription peut nécessiter une validation. Tant
  // qu'elle n'est pas validée, les droits actifs sont ceux de Découverte.
  const user = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.id, input.userId),
  });

  const requestedPlanCode = user?.pendingPlanCode || "decouverte";
  const requestedPlan = await db.query.subscriptionPlans.findFirst({
    where: (plan, { eq }) => eq(plan.code, requestedPlanCode),
  });
  const initialPlan = await db.query.subscriptionPlans.findFirst({
    where: (plan, { eq }) => eq(plan.code, "decouverte"),
  });

  if (!initialPlan) {
    throw new Error(
      "Catalogue des abonnements invalide : offre Découverte introuvable.",
    );
  }

  const planToRequest = requestedPlan ?? initialPlan;
  const { schedule = [], menu = [], ...restaurantInput } = input;
  const initialCategories = getInitialMenuCategories(
    initialPlan.maxCategories,
  );
  const allowedCategories = new Set<string>(initialCategories);

  if (menu.length > 1) {
    throw new SubscriptionLimitError(
      "L’onboarding permet d’ajouter un seul plat de démonstration.",
    );
  }

  if (initialPlan.maxPlats !== null && menu.length > initialPlan.maxPlats) {
    throw new SubscriptionLimitError(
      `L’offre ${initialPlan.nom} autorise au maximum ${initialPlan.maxPlats} plats.`,
    );
  }

  if (menu.some((item) => !allowedCategories.has(item.categorie.trim()))) {
    throw new SubscriptionLimitError(
      "Un plat utilise une catégorie qui ne fait pas partie des catégories initiales autorisées.",
    );
  }

  // Le pilote neon-http ne prend pas en charge les transactions interactives
  // `db.transaction(callback)`. `db.batch` envoie en revanche toutes les
  // requêtes dans une transaction HTTP atomique Neon.
  const restaurantId = crypto.randomUUID();
  const categoriesWithIds = initialCategories.map((nom, ordre) => ({
    id: crypto.randomUUID(),
    restaurantId,
    nom,
    ordre,
  }));
  const categoriesByName = new Map<string, string>(
    categoriesWithIds.map((category) => [category.nom, category.id]),
  );

  const operations: BatchItem<"pg">[] = [
    db.insert(restaurants).values({
      ...restaurantInput,
      id: restaurantId,
      slug,
      fraisLivraison: input.fraisLivraison ?? 0,
      commandeMinimum: input.commandeMinimum ?? 0,
      modesCommande: input.modesCommande ?? ["sur_place"],
      cuisines: input.cuisines ?? [],
      actif: false,
    }),
  ];

  if (schedule.length > 0) {
    operations.push(
      db.insert(creneauxHoraires).values(
        schedule.map((entry) => ({
          id: crypto.randomUUID(),
          restaurantId,
          nom: entry.nom,
          heureOuverture: entry.heureOuverture,
          heureFermeture: entry.heureFermeture,
          joursActifs: entry.joursActifs,
        })),
      ),
    );
  }

  if (categoriesWithIds.length > 0) {
    operations.push(db.insert(categories).values(categoriesWithIds));
  }

  if (menu.length > 0) {
    operations.push(
      db.insert(plats).values(
        menu.map((item, index) => ({
          id: crypto.randomUUID(),
          restaurantId,
          categorieId: categoriesByName.get(item.categorie.trim())!,
          nom: item.nom,
          description: item.description,
          prix: item.prix,
          photoUrl: item.photoUrl,
          ordre: index,
        })),
      ),
    );
  }

  if (planToRequest.code !== "decouverte") {
    operations.push(
      db.insert(subscriptionRequests).values({
        id: crypto.randomUUID(),
        restaurantId,
        planCode: planToRequest.code,
        prixFigeFcfa: planToRequest.prixAnnuelFcfa,
        statut: "en_attente",
      }),
    );
  }

  operations.push(
    db.insert(subscriptionPeriods).values({
      id: crypto.randomUUID(),
      restaurantId,
      planCode: initialPlan.code,
      tauxCommissionBpsFige: initialPlan.tauxCommissionBps,
      statut: "active",
    }),
  );

  if (user?.pendingPlanCode) {
    operations.push(
      db
        .update(users)
        .set({ pendingPlanCode: null })
        .where(eq(users.id, user.id)),
    );
  }

  await db.batch(
    operations as [BatchItem<"pg">, ...BatchItem<"pg">[]],
  );

  const restaurant = await db.query.restaurants.findFirst({
    where: (table, { eq: equals }) => equals(table.id, restaurantId),
  });
  if (!restaurant) {
    throw new Error("Restaurant introuvable après sa création.");
  }

  return restaurant;
}

export async function updateRestaurant(
  id: string,
  data: Partial<{
    nom: string;
    description: string;
    telephone: string;
    email: string;
    siteWeb: string;
    adresse: string;
    ville: string;
    pays: string;
    latitude: number;
    longitude: number;
    logoUrl: string | null;
    banniereUrl: string | null;
    fraisLivraison: number;
    commandeMinimum: number;
    modesCommande: string[];
    cuisines: string[];
    actif: boolean;
    enLigne: boolean;
    accepteCommandes: boolean;
    tempsPreparationMoyen: number;
    facebook: string | null;
    instagram: string | null;
    whatsapp: string | null;
  }>
) {
  const [restaurant] = await db
    .update(restaurants)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(restaurants.id, id))
    .returning();

  await invalidateRestaurantCache(id);
  return restaurant;
}

/** Replace un dossier refusé dans la file de validation administrateur. */
export async function resoumettreRestaurant(
  restaurantId: string,
  userId: string,
) {
  const [restaurant] = await db
    .update(restaurants)
    .set({ motifRejet: null, updatedAt: new Date() })
    .where(
      and(
        eq(restaurants.id, restaurantId),
        eq(restaurants.userId, userId),
        eq(restaurants.actif, false),
        eq(restaurants.suspendu, false),
        isNotNull(restaurants.motifRejet),
      ),
    )
    .returning();

  if (restaurant) {
    await invalidateRestaurantCache(restaurant.id, restaurant.slug);
    await invalidateCache(cacheKey.restaurantByUser(userId));
  }

  return restaurant;
}

/** Bascule en ligne / hors ligne */
export async function toggleEnLigne(id: string, enLigne: boolean) {
  const result = await db
    .update(restaurants)
    .set({ enLigne, updatedAt: new Date() })
    .where(eq(restaurants.id, id));

  await invalidateRestaurantCache(id);
  return result;
}

// ============================================================================
// CRENEAUX HORAIRES
// ============================================================================

export interface CreateCreneauInput {
  restaurantId: string;
  nom: string;
  heureOuverture: string; // "08:00"
  heureFermeture: string; // "14:00"
  joursActifs: string[];   // ["lundi","mardi","mercredi"]
  actif?: boolean;
}

export async function createCreneau(input: CreateCreneauInput) {
  const [creneau] = await db
    .insert(creneauxHoraires)
    .values({ ...input, actif: input.actif ?? true })
    .returning();

  await invalidateRestaurantCache(input.restaurantId);
  return creneau;
}

export async function updateCreneau(
  id: string,
  restaurantId: string,
  data: Partial<CreateCreneauInput>
) {
  const [creneau] = await db
    .update(creneauxHoraires)
    .set({ ...data, updatedAt: new Date() })
    .where(
      and(
        eq(creneauxHoraires.id, id),
        eq(creneauxHoraires.restaurantId, restaurantId)
      )
    )
    .returning();

  await invalidateRestaurantCache(restaurantId);
  return creneau;
}

export async function deleteCreneau(id: string, restaurantId: string) {
  const result = await db
    .delete(creneauxHoraires)
    .where(
      and(
        eq(creneauxHoraires.id, id),
        eq(creneauxHoraires.restaurantId, restaurantId)
      )
    )
    .returning({ id: creneauxHoraires.id });

  await invalidateRestaurantCache(restaurantId);
  return result;
}

// ============================================================================
// CATEGORIES
// ============================================================================

export interface CreateCategorieInput {
  restaurantId: string;
  nom: string;
  description?: string;
  imageUrl?: string;
  ordre?: number;
  creneauId?: string | null;
}

export async function createCategorie(input: CreateCategorieInput) {
  const [{ value }] = await db
    .select({ value: sql<number>`count(*)` })
    .from(categories)
    .where(eq(categories.restaurantId, input.restaurantId));

  const limits = await checkPlanLimits(input.restaurantId, "categories", Number(value));
  if (!limits) {
    throw new SubscriptionLimitError(
      "Limite de catégories atteinte pour votre offre actuelle.",
    );
  }

  const [categorie] = await db
    .insert(categories)
    .values({ ...input, ordre: input.ordre ?? 0 })
    .returning();

  await invalidateRestaurantCache(input.restaurantId);
  return categorie;
}

export async function updateCategorie(
  id: string,
  restaurantId: string,
  data: Partial<Omit<CreateCategorieInput, "restaurantId">>
) {
  const [categorie] = await db
    .update(categories)
    .set({ ...data, updatedAt: new Date() })
    .where(
      and(
        eq(categories.id, id),
        eq(categories.restaurantId, restaurantId)
      )
    )
    .returning();

  await invalidateRestaurantCache(restaurantId);
  return categorie;
}

export async function deleteCategorie(id: string, restaurantId: string) {
  // Note: onDelete "restrict" sur plats → erreur si plats existent encore
  const result = await db
    .delete(categories)
    .where(
      and(
        eq(categories.id, id),
        eq(categories.restaurantId, restaurantId)
      )
    );

  await invalidateRestaurantCache(restaurantId);
  return result;
}

/** Réordonne plusieurs catégories en une seule transaction */
export async function reordonnerCategories(
  restaurantId: string,
  ordres: { id: string; ordre: number }[]
) {
  const result = await db.transaction(async (tx) => {
    for (const { id, ordre } of ordres) {
      await tx
        .update(categories)
        .set({ ordre, updatedAt: new Date() })
        .where(
          and(
            eq(categories.id, id),
            eq(categories.restaurantId, restaurantId)
          )
        );
    }
  });

  await invalidateRestaurantCache(restaurantId);
  return result;
}

// ============================================================================
// PLATS
// ============================================================================

export interface CreatePlatInput {
  restaurantId: string;
  categorieId: string;
  nom: string;
  description?: string;
  prix: number;             // centimes
  photoUrl?: string | null;
  disponible?: boolean;
  ordre?: number;
  tags?: string[];
  allergenes?: string[];
  nutrition?: {
    calories: number;
    proteines: number;
    lipides: number;
    glucides: number;
  };
  creneauId?: string | null;
}

export async function createPlat(input: CreatePlatInput) {
  const [{ value }] = await db
    .select({ value: sql<number>`count(*)` })
    .from(plats)
    .where(eq(plats.restaurantId, input.restaurantId));

  const limits = await checkPlanLimits(input.restaurantId, "plats", Number(value));
  if (!limits) {
    throw new SubscriptionLimitError(
      "Limite de plats atteinte pour votre offre actuelle.",
    );
  }

  const [plat] = await db
    .insert(plats)
    .values({
      ...input,
      disponible: input.disponible ?? true,
      ordre: input.ordre ?? 0,
      tags: input.tags ?? [],
      allergenes: input.allergenes ?? [],
    })
    .returning();

  await invalidateRestaurantCache(input.restaurantId);
  return plat;
}

export async function updatePlat(
  id: string,
  restaurantId: string,
  data: Partial<Omit<CreatePlatInput, "restaurantId">>
) {
  const [plat] = await db
    .update(plats)
    .set({ ...data, updatedAt: new Date() })
    .where(
      and(
        eq(plats.id, id),
        eq(plats.restaurantId, restaurantId)
      )
    )
    .returning();

  await invalidateRestaurantCache(restaurantId);
  return plat;
}

export async function toggleDisponibilitePlat(
  id: string,
  restaurantId: string,
  disponible: boolean
) {
  const [plat] = await db
    .update(plats)
    .set({ disponible, updatedAt: new Date() })
    .where(
      and(
        eq(plats.id, id),
        eq(plats.restaurantId, restaurantId)
      )
    )
    .returning();

  await invalidateRestaurantCache(restaurantId);
  return plat;
}

export async function deletePlat(id: string, restaurantId: string) {
  const result = await db
    .delete(plats)
    .where(
      and(
        eq(plats.id, id),
        eq(plats.restaurantId, restaurantId)
      )
    )
    .returning({ id: plats.id });

  await invalidateRestaurantCache(restaurantId);
  return result;
}

/** Réordonne plusieurs plats en une seule transaction */
export async function reordonnerPlats(
  restaurantId: string,
  ordres: { id: string; ordre: number }[]
) {
  const result = await db.transaction(async (tx) => {
    for (const { id, ordre } of ordres) {
      await tx
        .update(plats)
        .set({ ordre, updatedAt: new Date() })
        .where(
          and(
            eq(plats.id, id),
            eq(plats.restaurantId, restaurantId)
          )
        );
    }
  });

  await invalidateRestaurantCache(restaurantId);
  return result;
}

// ============================================================================
// CLIENTS
// ============================================================================

export interface CreateClientInput {
  nom: string;
  telephone: string;
  email?: string;
  passwordHash?: string;
  adresseDefaut?: string;
  latitudeDefaut?: number;
  longitudeDefaut?: number;
}

export async function upsertClient(input: CreateClientInput) {
  // Cherche par téléphone, crée si inexistant
  const existing = await db.query.clients.findFirst({
    where: (c, { eq }) => eq(c.telephone, input.telephone),
  });

  if (existing) return existing;

  const [client] = await db
    .insert(clients)
    .values({
      nom: input.nom,
      telephone: input.telephone,
      email: input.email,
      password: input.passwordHash,
      adresseDefaut: input.adresseDefaut,
      latitudeDefaut: input.latitudeDefaut,
      longitudeDefaut: input.longitudeDefaut,
    })
    .returning();

  return client;
}

// ============================================================================
// PAIEMENTS
// ============================================================================

export interface CreatePaiementInput {
  commandeId: string;
  montant: number;
  methode: "especes" | "carte" | "mobile_money" | "en_ligne";
  referenceExterne?: string;
  numeroMobileMoney?: string;
  operateur?: string;
}

export async function createPaiement(input: CreatePaiementInput) {
  const [paiement] = await db
    .insert(paiements)
    .values({ ...input, statut: "en_attente" })
    .returning();
  return paiement;
}

export async function marquerPaiementPaye(id: string) {
  const [paiement] = await db
    .update(paiements)
    .set({ statut: "paye", payeAt: new Date(), updatedAt: new Date() })
    .where(eq(paiements.id, id))
    .returning();
  return paiement;
}

// ============================================================================
// LIVREURS
// ============================================================================

export interface CreateLivreurInput {
  restaurantId: string;
  nom: string;
  telephone: string;
  vehicule?: string;
  numeroVehicule?: string;
}

export async function createLivreur(input: CreateLivreurInput) {
  const [livreur] = await db
    .insert(livreurs)
    .values(input)
    .returning();
  return livreur;
}

export async function updateLivreur(
  id: string,
  restaurantId: string,
  data: Partial<Omit<CreateLivreurInput, "restaurantId">>
) {
  const [livreur] = await db
    .update(livreurs)
    .set({ ...data, updatedAt: new Date() })
    .where(
      and(
        eq(livreurs.id, id),
        eq(livreurs.restaurantId, restaurantId)
      )
    )
    .returning();
  return livreur;
}

export interface AssignerLivreurInput {
  commandeId: string;
  livreurId: string;
  adresse: string;
  latitude: number;
  longitude: number;
  distanceKm?: number | null;
}

export async function assignerLivreur({
  commandeId,
  livreurId,
  adresse,
  latitude,
  longitude,
  distanceKm,
}: AssignerLivreurInput) {
  const now = new Date();
  const [livraison] = await db
    .insert(livraisons)
    .values({
      commandeId,
      livreurId,
      statut: "assignee",
      adresse,
      latitude,
      longitude,
      distanceKm: distanceKm ?? null,
      heureAssignee: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: livraisons.commandeId,
      set: {
        livreurId,
        statut: "assignee",
        heureAssignee: now,
        updatedAt: now,
      },
    })
    .returning();
  return livraison;
}

// ============================================================================
// PROMOTIONS
// ============================================================================

export interface CreatePromotionInput {
  restaurantId: string;
  nom: string;
  description?: string;
  type: "pourcentage" | "montant_fixe" | "offre_1_1" | "livraison_gratuite";
  valeur: number;
  platId?: string | null;
  categorieId?: string | null;
  codePromo?: string;
  montantMinCommande?: number;
  utilisationsMax?: number;
  dateDebut: Date;
  dateFin?: Date | null;
}

export async function createPromotion(input: CreatePromotionInput) {
  const [promo] = await db
    .insert(promotions)
    .values({ ...input, actif: true })
    .returning();
  return promo;
}

export async function togglePromotion(id: string, restaurantId: string, actif: boolean) {
  return db
    .update(promotions)
    .set({ actif, updatedAt: new Date() })
    .where(
      and(
        eq(promotions.id, id),
        eq(promotions.restaurantId, restaurantId)
      )
    );
}

// ============================================================================
// AVIS
// ============================================================================

export interface CreateAvisInput {
  commandeId: string;
  restaurantId: string;
  clientId?: string | null;
  note: number;
  noteNourriture?: number;
  noteLivraison?: number;
  noteService?: number;
  commentaire?: string;
}

export async function createAvis(input: CreateAvisInput) {
  const [avisCreated] = await db
    .insert(avis)
    .values(input)
    .returning();

  // Recalcule la note moyenne du restaurant
  await recalculerNoteMoyenne(input.restaurantId);

  return avisCreated;
}

export async function repondreAvis(
  id: string,
  restaurantId: string,
  reponse: string
) {
  return db
    .update(avis)
    .set({
      reponseRestaurant: reponse,
      reponduAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(avis.id, id),
        eq(avis.restaurantId, restaurantId)
      )
    );
}

async function recalculerNoteMoyenne(restaurantId: string) {
  const result = await db
    .select({
      moyenne: sql<number>`ROUND(AVG(${avis.note})::numeric, 1)`,
      total: sql<number>`COUNT(*)`,
    })
    .from(avis)
    .where(
      and(
        eq(avis.restaurantId, restaurantId),
        eq(avis.visible, true)
      )
    );

  if (result[0]) {
    await db
      .update(restaurants)
      .set({
        noteMoyenne: result[0].moyenne,
        nombreAvis: result[0].total,
        updatedAt: new Date(),
      })
      .where(eq(restaurants.id, restaurantId));
  }
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export interface CreateNotificationInput {
  userId?: string;
  clientId?: string;
  type:
    | "nouvelle_commande"
    | "commande_prete"
    | "commande_annulee"
    | "nouveau_avis"
    | "promotion"
    | "systeme";
  titre: string;
  message: string;
  lienType?: string;
  lienId?: string;
}

export async function createNotificationUser(input: CreateNotificationInput) {
  const [notif] = await db
    .insert(notifications)
    .values(input)
    .returning();
  return notif;
}

export async function marquerNotificationLue(id: string, userId: string) {
  return db
    .update(notifications)
    .set({ lue: true, lueAt: new Date() })
    .where(
      and(
        eq(notifications.id, id),
        eq(notifications.userId, userId)
      )
    );
}

export async function marquerToutesLues(userId: string) {
  return db
    .update(notifications)
    .set({ lue: true, lueAt: new Date() })
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.lue, false)
      )
    );
}
