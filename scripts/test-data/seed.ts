/**
 * Seed de développement/test explicitement isolé.
 * npm run db:seed -- --confirmed-development-test
 */

import { hash } from "bcryptjs";
import { assertTestDataEnvironment } from "./data-environment";
import { db } from "@/infrastructure/db";
import {
  categories,
  clients,
  commandes,
  creneauxHoraires,
  plats,
  partnerAccounts,
  restaurants,
  subscriptionPeriods,
  subscriptionPeriodLimits,
  users,
} from "@/infrastructure/db/schema";

async function seed() {
  const target = assertTestDataEnvironment({
    argv: process.argv,
    env: process.env,
  });
  console.log("🌱 Démarrage du seed...");
  console.log(
    `Cible déclarée : ${target.environment} (${target.databaseHost}/${target.databaseName})`,
  );

  // ── 1. Users (Admin + Restaurateur) ──────────────────────────────────────
  // Aucun mot de passe en dur : il DOIT venir de l'environnement.
  const seedPassword = process.env.SEED_PASSWORD;
  if (!seedPassword || seedPassword.length < 12) {
    throw new Error(
      "SEED_PASSWORD manquant ou trop court (min 12 caractères). " +
        "Exemple : SEED_PASSWORD=\"$(openssl rand -base64 24)\" npm run db:seed",
    );
  }
  const passwordHash = await hash(seedPassword, 12);

  const [adminUser] = await db
    .insert(users)
    .values({
      nom: "Super Admin",
      email: "admin@restauci.com",
      password: passwordHash,
      telephone: "+225 00 00 00 00",
      role: "admin",
      emailVerifie: true,
    })
    .returning();
  console.log("✅ Admin créé:", adminUser.email);

  const [user] = await db
    .insert(users)
    .values({
      nom: "Orlando Laurentius",
      email: "orlando@restauci.com",
      password: passwordHash,
      telephone: "+225 07 00 00 00",
      role: "partner",
      emailVerifie: true,
    })
    .returning();
  console.log("✅ User créé:", user.email);

  const [partnerAccount] = await db
    .insert(partnerAccounts)
    .values({ userId: user.id, activityType: "restaurant" })
    .returning();

  // ── 2. Restaurant ────────────────────────────────────────────────────────
  const [restaurant] = await db
    .insert(restaurants)
    .values({
      partnerAccountId: partnerAccount.id,
      nom: "Bella Italia Abidjan",
      slug: "bella-italia-abidjan",
      description:
        "Restaurant italien authentique au cœur d'Abidjan. Pizzas au feu de bois, pâtes fraîches et desserts maison.",
      telephone: "+225 27 00 00 00",
      email: "contact@bella-italia.ci",
      adresse: "Cocody Riviera 3, Rue des Jardins",
      ville: "Abidjan",
      pays: "Côte d'Ivoire",
      latitude: 5.3599,
      longitude: -3.99,
      fraisLivraison: 1500,
      commandeMinimum: 5000,
      modesCommande: ["sur_place", "livraison", "emporter"],
      cuisines: ["Italienne", "Pizza", "Pâtes"],
      actif: true,
      enLigne: true,
      tempsPreparationMoyen: 25,
    })
    .returning();
  console.log("✅ Restaurant créé:", restaurant.nom);

  // ── 3. Abonnement ────────────────────────────────────────────────────────
  // ── 3. Abonnement (nouveau système subscription_periods) ────────────────
  const [proPlan] = await db.query.subscriptionPlans.findFirst({
    where: (p, { eq }) => eq(p.code, "partenaire_fier"),
    with: { limits: { where: (limit, { eq }) => eq(limit.activityType, "restaurant") } },
  }).then((row) => row ? [row] : []);

  if (proPlan) {
    const dateEcheance = new Date();
    dateEcheance.setFullYear(dateEcheance.getFullYear() + 1);
    const periodId = crypto.randomUUID();
    await db.insert(subscriptionPeriods).values({
      id: periodId,
      partnerAccountId: partnerAccount.id,
      planCode: "partenaire_fier",
      tauxCommissionBpsFige: proPlan.tauxCommissionBps,
      prixPayeFcfa: proPlan.prixAnnuelFcfa,
      dateDebut: new Date(),
      dateEcheance,
      statut: "active",
    });
    if (proPlan.limits.length !== 2) throw new Error("Quotas du seed incomplets");
    await db.insert(subscriptionPeriodLimits).values(
      proPlan.limits.map((limit) => ({
        subscriptionPeriodId: periodId,
        activityType: limit.activityType,
        resourceType: limit.resourceType,
        maxCount: limit.maxCount,
      })),
    );
  }

  // ── 4. Créneaux horaires ─────────────────────────────────────────────────
  await db
    .insert(creneauxHoraires)
    .values([
      {
        restaurantId: restaurant.id,
        nom: "Déjeuner",
        heureOuverture: "11:30",
        heureFermeture: "15:00",
        joursActifs: ["lundi", "mardi", "mercredi", "jeudi", "vendredi"],
        actif: true,
      },
      {
        restaurantId: restaurant.id,
        nom: "Dîner",
        heureOuverture: "18:00",
        heureFermeture: "23:00",
        joursActifs: [
          "lundi",
          "mardi",
          "mercredi",
          "jeudi",
          "vendredi",
          "samedi",
          "dimanche",
        ],
        actif: true,
      },
    ])
    .returning();
  console.log("✅ Créneaux créés");

  // ── 5. Catégories ─────────────────────────────────────────────────────────
  const [catPizza, catPates, catBurger, catSalade, catDessert, catBoisson] =
    await db
      .insert(categories)
      .values([
        { restaurantId: restaurant.id, nom: "Pizzas", ordre: 1, firstPublishedAt: new Date() },
        { restaurantId: restaurant.id, nom: "Pâtes", ordre: 2, firstPublishedAt: new Date() },
        { restaurantId: restaurant.id, nom: "Burgers", ordre: 3, firstPublishedAt: new Date() },
        { restaurantId: restaurant.id, nom: "Salades", ordre: 4, firstPublishedAt: new Date() },
        { restaurantId: restaurant.id, nom: "Desserts", ordre: 5, firstPublishedAt: new Date() },
        { restaurantId: restaurant.id, nom: "Boissons", ordre: 6, firstPublishedAt: new Date() },
      ])
      .returning();
  console.log("✅ Catégories créées");

  // ── 6. Plats ──────────────────────────────────────────────────────────────
  await db.insert(plats).values([
    // Pizzas
    {
      restaurantId: restaurant.id,
      categorieId: catPizza.id,
      nom: "Smokey Supreme Pizza",
      description:
        "Sauce tomate, mozzarella, pepperoni, poivrons, olives noires",
      prix: 12000,
      disponible: true,
      ordre: 1,
      tags: ["Personnalisable"],
      nutrition: { calories: 820, proteines: 38, lipides: 32, glucides: 95 },
    },
    {
      restaurantId: restaurant.id,
      categorieId: catPizza.id,
      nom: "Margherita",
      description: "Sauce tomate, mozzarella di bufala, basilic frais",
      prix: 9000,
      disponible: true,
      ordre: 2,
      tags: ["Végétarien"],
    },
    // Pâtes
    {
      restaurantId: restaurant.id,
      categorieId: catPates.id,
      nom: "Spaghetti Carbonara",
      description: "Spaghetti, lardons fumés, jaune d'œuf, pecorino",
      prix: 15000,
      disponible: true,
      ordre: 1,
      nutrition: { calories: 680, proteines: 28, lipides: 24, glucides: 88 },
    },
    {
      restaurantId: restaurant.id,
      categorieId: catPates.id,
      nom: "Penne à la crème",
      description: "Penne, crème fraîche, champignons, jambon, parmesan",
      prix: 18000,
      disponible: true,
      ordre: 2,
    },
    // Burgers
    {
      restaurantId: restaurant.id,
      categorieId: catBurger.id,
      nom: "Cheeseburger classique",
      description: "Steak haché, cheddar, salade, tomate, oignon, sauce maison",
      prix: 10000,
      disponible: true,
      ordre: 1,
      tags: ["Promo"],
    },
    // Salades
    {
      restaurantId: restaurant.id,
      categorieId: catSalade.id,
      nom: "Salade César",
      description: "Romaine, croûtons, parmesan, sauce César",
      prix: 8000,
      disponible: true,
      ordre: 1,
    },
    // Desserts
    {
      restaurantId: restaurant.id,
      categorieId: catDessert.id,
      nom: "Moelleux au chocolat",
      description: "Cœur fondant, boule de glace vanille",
      prix: 10000,
      disponible: true,
      ordre: 1,
      tags: ["Personnalisable"],
    },
    // Boissons
    {
      restaurantId: restaurant.id,
      categorieId: catBoisson.id,
      nom: "Eau minérale",
      description: "50cl",
      prix: 2000,
      disponible: true,
      ordre: 1,
    },
    {
      restaurantId: restaurant.id,
      categorieId: catBoisson.id,
      nom: "Coca-Cola",
      description: "33cl",
      prix: 3500,
      disponible: true,
      ordre: 2,
    },
  ].map((dish) => ({ ...dish, firstPublishedAt: new Date() })));
  console.log("✅ Plats créés");

  // ── 7. Client de test ─────────────────────────────────────────────────────
  const [client] = await db
    .insert(clients)
    .values({
      nom: "Alice Johnson",
      telephone: "+225 01 00 00 00",
      email: "alice@example.com",
    })
    .returning();

  // ── 8. Commande de test ───────────────────────────────────────────────────
  await db.insert(commandes).values({
    numero: "CMD-20241025-TEST",
    restaurantId: restaurant.id,
    clientId: client.id,
    modeCommande: "sur_place",
    statut: "prete",
    numeroTable: "12",
    nomClient: "Alice Johnson",
    telephoneClient: "+225 01 00 00 00",
    items: [
      {
        platId: "seed-pizza",
        nom: "Smokey Supreme Pizza",
        prix: 12000,
        quantite: 1,
      },
      { platId: "seed-salade", nom: "Salade César", prix: 8000, quantite: 1 },
    ],
    sousTotal: 20000,
    fraisLivraison: 0,
    remise: 0,
    total: 20000,
    tempsPreparationEstime: 25,
    heureAcceptee: new Date(),
    heurePrete: new Date(),
  });

  console.log("✅ Commande de test créée");
  console.log("\n🎉 Seed terminé avec succès !");
  console.log("─────────────────────────────");
  console.log("Email:    orlando@restauci.com");
  console.log("Password: (valeur SEED_PASSWORD utilisée — non affichée)");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Erreur seed:", err);
  process.exit(1);
});
