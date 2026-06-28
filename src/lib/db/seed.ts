/**
 * Seed de développement
 * npx tsx db/seed.ts
 */

import { hash } from "bcryptjs";
import { db } from "./index";
import {
  abonnements,
  categories,
  clients,
  commandes,
  creneauxHoraires,
  plats,
  restaurants,
  users,
} from "./schema";

async function seed() {
  console.log("🌱 Démarrage du seed...");

  // ── 1. Users (Admin + Restaurateur) ──────────────────────────────────────
  const passwordHash = await hash("password123", 12);

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
      role: "restaurateur",
      emailVerifie: true,
    })
    .returning();
  console.log("✅ User créé:", user.email);

  // ── 2. Restaurant ────────────────────────────────────────────────────────
  const [restaurant] = await db
    .insert(restaurants)
    .values({
      userId: user.id,
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
      fraisLivraison: 150000, // 1500 FCFA en centimes
      commandeMinimum: 500000, // 5000 FCFA
      modesCommande: ["sur_place", "livraison", "emporter"],
      cuisines: ["Italienne", "Pizza", "Pâtes"],
      actif: true,
      enLigne: true,
      tempsPreparationMoyen: 25,
    })
    .returning();
  console.log("✅ Restaurant créé:", restaurant.nom);

  // ── 3. Abonnement ────────────────────────────────────────────────────────
  await db.insert(abonnements).values({
    restaurantId: restaurant.id,
    plan: "pro",
    statut: "actif",
    maxPlats: 200,
    maxCategories: 30,
    dateFin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });

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
        { restaurantId: restaurant.id, nom: "Pizzas", ordre: 1 },
        { restaurantId: restaurant.id, nom: "Pâtes", ordre: 2 },
        { restaurantId: restaurant.id, nom: "Burgers", ordre: 3 },
        { restaurantId: restaurant.id, nom: "Salades", ordre: 4 },
        { restaurantId: restaurant.id, nom: "Desserts", ordre: 5 },
        { restaurantId: restaurant.id, nom: "Boissons", ordre: 6 },
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
      prix: 1200000, // 12 000 FCFA
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
      prix: 900000,
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
      prix: 1500000,
      disponible: true,
      ordre: 1,
      nutrition: { calories: 680, proteines: 28, lipides: 24, glucides: 88 },
    },
    {
      restaurantId: restaurant.id,
      categorieId: catPates.id,
      nom: "Penne à la crème",
      description: "Penne, crème fraîche, champignons, jambon, parmesan",
      prix: 1800000,
      disponible: true,
      ordre: 2,
    },
    // Burgers
    {
      restaurantId: restaurant.id,
      categorieId: catBurger.id,
      nom: "Cheeseburger classique",
      description: "Steak haché, cheddar, salade, tomate, oignon, sauce maison",
      prix: 1000000,
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
      prix: 800000,
      disponible: true,
      ordre: 1,
    },
    // Desserts
    {
      restaurantId: restaurant.id,
      categorieId: catDessert.id,
      nom: "Moelleux au chocolat",
      description: "Cœur fondant, boule de glace vanille",
      prix: 1000000,
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
      prix: 200000,
      disponible: true,
      ordre: 1,
    },
    {
      restaurantId: restaurant.id,
      categorieId: catBoisson.id,
      nom: "Coca-Cola",
      description: "33cl",
      prix: 350000,
      disponible: true,
      ordre: 2,
    },
  ]);
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
        prix: 1200000,
        quantite: 1,
      },
      { platId: "seed-salade", nom: "Salade César", prix: 800000, quantite: 1 },
    ],
    sousTotal: 2000000,
    fraisLivraison: 0,
    remise: 0,
    total: 2000000,
    tempsPreparationEstime: 25,
    heureAcceptee: new Date(),
    heurePrete: new Date(),
  });

  console.log("✅ Commande de test créée");
  console.log("\n🎉 Seed terminé avec succès !");
  console.log("─────────────────────────────");
  console.log("Email:    orlando@restauci.com");
  console.log("Password: password123");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Erreur seed:", err);
  process.exit(1);
});
