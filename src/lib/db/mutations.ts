import { db } from "./index";
import { eq, and, sql } from "drizzle-orm";
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
  type CommandeItemDB,
} from "./schema";

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

/** Génère un numéro de commande unique : CMD-20241025-XXXX */
export function genererNumeroCommande(): string {
  const date = new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CMD-${date}-${rand}`;
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
}

export async function createRestaurant(input: CreateRestaurantInput) {
  let slug = slugify(input.nom);

  // Unicité du slug
  const existing = await db.query.restaurants.findFirst({
    where: (r, { eq }) => eq(r.slug, slug),
  });
  if (existing) slug = `${slug}-${Date.now()}`;

  const [restaurant] = await db
    .insert(restaurants)
    .values({
      ...input,
      slug,
      fraisLivraison: input.fraisLivraison ?? 0,
      commandeMinimum: input.commandeMinimum ?? 0,
      modesCommande: input.modesCommande ?? ["sur_place"],
      cuisines: input.cuisines ?? [],
      actif: false,
    })
    .returning();

  // Crée l'abonnement gratuit par défaut
  await db.insert(abonnements).values({
    restaurantId: restaurant.id,
    plan: "gratuit",
    statut: "essai",
    maxPlats: 20,
    maxCategories: 5,
  });

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
  return restaurant;
}

/** Bascule en ligne / hors ligne */
export async function toggleEnLigne(id: string, enLigne: boolean) {
  return db
    .update(restaurants)
    .set({ enLigne, updatedAt: new Date() })
    .where(eq(restaurants.id, id));
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
  return creneau;
}

export async function deleteCreneau(id: string, restaurantId: string) {
  return db
    .delete(creneauxHoraires)
    .where(
      and(
        eq(creneauxHoraires.id, id),
        eq(creneauxHoraires.restaurantId, restaurantId)
      )
    );
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
  const [categorie] = await db
    .insert(categories)
    .values({ ...input, ordre: input.ordre ?? 0 })
    .returning();
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
  return categorie;
}

export async function deleteCategorie(id: string, restaurantId: string) {
  // Note: onDelete "restrict" sur plats → erreur si plats existent encore
  return db
    .delete(categories)
    .where(
      and(
        eq(categories.id, id),
        eq(categories.restaurantId, restaurantId)
      )
    );
}

/** Réordonne plusieurs catégories en une seule transaction */
export async function reordonnerCategories(
  restaurantId: string,
  ordres: { id: string; ordre: number }[]
) {
  return db.transaction(async (tx) => {
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
  return plat;
}

export async function deletePlat(id: string, restaurantId: string) {
  return db
    .delete(plats)
    .where(
      and(
        eq(plats.id, id),
        eq(plats.restaurantId, restaurantId)
      )
    );
}

/** Réordonne plusieurs plats en une seule transaction */
export async function reordonnerPlats(
  restaurantId: string,
  ordres: { id: string; ordre: number }[]
) {
  return db.transaction(async (tx) => {
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
}

// ============================================================================
// COMMANDES
// ============================================================================

export interface CreateCommandeInput {
  restaurantId: string;
  clientId?: string | null;
  modeCommande: "sur_place" | "livraison" | "emporter";
  nomClient: string;
  telephoneClient?: string;
  numeroTable?: string;
  adresseLivraison?: string;
  latitudeLivraison?: number;
  longitudeLivraison?: number;
  distanceKm?: number;
  items: CommandeItemDB[];
  sousTotal: number;
  fraisLivraison?: number;
  remise?: number;
  total: number;
  noteClient?: string;
  tempsPreparationEstime?: number;
}

export async function createCommande(input: CreateCommandeInput) {
  const numero = genererNumeroCommande();

  const [commande] = await db
    .insert(commandes)
    .values({
      ...input,
      numero,
      statut: "recue",
      fraisLivraison: input.fraisLivraison ?? 0,
      remise: input.remise ?? 0,
    })
    .returning();

  // Incrémenter le compteur du restaurant
  await db
    .update(restaurants)
    .set({
      nombreCommandes: sql`${restaurants.nombreCommandes} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(restaurants.id, input.restaurantId));

  // Incrémenter le compteur de chaque plat commandé
  for (const item of input.items) {
    await db
      .update(plats)
      .set({
        nombreCommandes: sql`${plats.nombreCommandes} + ${item.quantite}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(plats.id, item.platId),
          eq(plats.restaurantId, input.restaurantId)
        )
      );
  }

  // Notification au restaurateur
  await createNotificationUser({
    userId: await getUserIdFromRestaurant(input.restaurantId),
    type: "nouvelle_commande",
    titre: "Nouvelle commande !",
    message: `Commande ${numero} de ${input.nomClient} — ${formatPrix(input.total)}`,
    lienType: "commande",
    lienId: commande.id,
  });

  return commande;
}

export async function updateStatutCommande(
  id: string,
  restaurantId: string,
  statut: "recue" | "en_preparation" | "prete" | "servie" | "annulee"
) {
  const now = new Date();
  const timestampFields: Record<string, Date> = {};

  if (statut === "en_preparation") timestampFields.heureAcceptee = now;
  if (statut === "prete")          timestampFields.heurePrete    = now;
  if (statut === "servie")         timestampFields.heureServie   = now;

  const [commande] = await db
    .update(commandes)
    .set({ statut, ...timestampFields, updatedAt: now })
    .where(
      and(
        eq(commandes.id, id),
        eq(commandes.restaurantId, restaurantId)
      )
    )
    .returning();

  return commande;
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

export async function assignerLivreur(commandeId: string, livreurId: string) {
  const [livraison] = await db
    .update(livraisons)
    .set({
      livreurId,
      statut: "assignee",
      heureAssignee: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(livraisons.commandeId, commandeId))
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

// ============================================================================
// ABONNEMENTS
// ============================================================================

export async function upgraderAbonnement(
  restaurantId: string,
  plan: "gratuit" | "starter" | "pro" | "entreprise"
) {
  const limites = {
    gratuit:    { maxPlats: 20,  maxCategories: 5  },
    starter:    { maxPlats: 50,  maxCategories: 10 },
    pro:        { maxPlats: 200, maxCategories: 30 },
    entreprise: { maxPlats: 999, maxCategories: 99 },
  };

  const dateFin = new Date();
  dateFin.setMonth(dateFin.getMonth() + 1);

  const [abonnement] = await db
    .update(abonnements)
    .set({
      plan,
      statut: "actif",
      dateFin,
      ...limites[plan],
      updatedAt: new Date(),
    })
    .where(eq(abonnements.restaurantId, restaurantId))
    .returning();

  return abonnement;
}

// ============================================================================
// UTILS INTERNES
// ============================================================================

async function getUserIdFromRestaurant(restaurantId: string): Promise<string> {
  const restaurant = await db.query.restaurants.findFirst({
    where: (r, { eq }) => eq(r.id, restaurantId),
    columns: { userId: true },
  });
  return restaurant!.userId;
}

export function formatPrix(centimes: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    minimumFractionDigits: 0,
  }).format(centimes);
}