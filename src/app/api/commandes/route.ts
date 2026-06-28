import { db, pool } from "@/lib/db";
import { commandes, plats, restaurants } from "@/lib/db/schema";
import { commandeLogger } from "@/lib/loggers";
import { checkRateLimit, commandeLimiter } from "@/lib/rate-limit";
import { haversineDistance } from "@/lib/utils/geo";
import { commandeSchema } from "@/lib/validations/commande";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0] ??
    request.headers.get("x-real-ip") ??
    "anonymous";
  const rateLimitResponse = await checkRateLimit(commandeLimiter, ip);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      commandeLogger.warn(
        { ip, reason: "invalid json body" },
        "Commande creation request with invalid JSON",
      );
      return NextResponse.json(
        { error: "Corps de requête invalide — JSON attendu." },
        { status: 400 },
      );
    }

    const validation = commandeSchema.safeParse(body);

    if (!validation.success) {
      commandeLogger.warn(
        {
          ip,
          reason: "invalid commande format",
          errors: validation.error.flatten().fieldErrors,
        },
        "Commande creation attempt with invalid format",
      );
      return NextResponse.json(
        {
          error: "Données invalides",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const data = validation.data;

    // Log commande creation attempt (without sensitive data)
    commandeLogger.info(
      {
        ip,
        restaurantId: data.restaurantId,
        modeCommande: data.modeCommande,
        itemCount: data.items.length,
      },
      "Commande creation attempt",
    );

    const [restaurant] = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.id, data.restaurantId))
      .limit(1);

    if (!restaurant || restaurant.actif === false) {
      commandeLogger.warn(
        {
          ip,
          restaurantId: data.restaurantId,
          reason: "restaurant not found or inactive",
        },
        "Commande creation failed",
      );
      return NextResponse.json(
        { error: "Restaurant introuvable ou inactif." },
        { status: 404 },
      );
    }

    if (data.modeCommande === "livraison" && !data.telephoneClient?.trim()) {
      commandeLogger.warn(
        {
          ip,
          restaurantId: data.restaurantId,
          reason: "missing telephone for delivery",
        },
        "Commande creation failed",
      );
      return NextResponse.json(
        { error: "Le téléphone est requis pour une livraison." },
        { status: 400 },
      );
    }

    if (data.modeCommande === "sur_place" && !data.numeroTable?.trim()) {
      commandeLogger.warn(
        {
          ip,
          restaurantId: data.restaurantId,
          reason: "missing table number for dine-in",
        },
        "Commande creation failed",
      );
      return NextResponse.json(
        {
          error: "Le numéro de table est requis pour les commandes sur place.",
        },
        { status: 400 },
      );
    }

    const platRecords = await Promise.all(
      data.items.map(async (item) => {
        const [platRecord] = await db
          .select()
          .from(plats)
          .where(eq(plats.id, item.platId))
          .limit(1);
        return platRecord;
      }),
    );

    if (
      platRecords.some(
        (plat) => !plat || plat?.restaurantId !== data.restaurantId,
      )
    ) {
      commandeLogger.warn(
        {
          ip,
          restaurantId: data.restaurantId,
          reason: "invalid plat for restaurant",
        },
        "Commande creation failed",
      );
      return NextResponse.json(
        { error: "Un ou plusieurs plats sont invalides pour ce restaurant." },
        { status: 400 },
      );
    }

    const itemsSnapshot = data.items.map((item) => {
      const plat = platRecords.find((record) => record?.id === item.platId)!;
      return {
        platId: item.platId,
        nom: plat.nom,
        prix: plat.prix,
        quantite: item.quantite,
      };
    });

    const sousTotal = itemsSnapshot.reduce(
      (sum, item) => sum + item.prix * item.quantite,
      0,
    );

    let fraisLivraison = 0;
    let distanceKm: number | null = null;

    if (
      data.modeCommande === "livraison" &&
      data.latitudeLivraison != null &&
      data.longitudeLivraison != null
    ) {
      const distance = haversineDistance(
        {
          latitude: data.latitudeLivraison,
          longitude: data.longitudeLivraison,
        },
        { latitude: restaurant.latitude, longitude: restaurant.longitude },
      );
      distanceKm = distance.distanceKm;
      fraisLivraison = Math.max(500, Math.round(distanceKm * 200));
    }

    const total = sousTotal + fraisLivraison;
    const numero = `CMD-${formatDate(new Date())}-${String(
      Math.floor(Math.random() * 10000),
    ).padStart(4, "0")}`;

    const [inserted] = await db
      .insert(commandes)
      .values({
        numero,
        restaurantId: data.restaurantId,
        clientId: null,
        modeCommande: data.modeCommande,
        statut: "recue",
        numeroTable:
          data.modeCommande === "sur_place" ? data.numeroTable : null,
        nomClient: data.nomClient.trim(),
        telephoneClient: data.telephoneClient?.trim() ?? null,
        adresseLivraison:
          data.modeCommande === "livraison"
            ? (data.adresseLivraison?.trim() ?? null)
            : null,
        latitudeLivraison:
          data.modeCommande === "livraison" ? data.latitudeLivraison : null,
        longitudeLivraison:
          data.modeCommande === "livraison" ? data.longitudeLivraison : null,
        distanceKm,
        items: itemsSnapshot,
        sousTotal,
        fraisLivraison,
        total,
      })
      .returning({ id: commandes.id, numero: commandes.numero });

    const pgClient = await pool.connect();
    try {
      await pgClient.query("SELECT pg_notify($1, $2)", [
        "nouvelle_commande",
        JSON.stringify({
          restaurantId: data.restaurantId,
          commandeId: inserted.id,
        }),
      ]);
    } catch (notifyError) {
      commandeLogger.error(
        {
          ip,
          restaurantId: data.restaurantId,
          error:
            notifyError instanceof Error
              ? notifyError.message
              : "Unknown error",
        },
        "pg_notify error",
      );
    } finally {
      pgClient.release();
    }

    commandeLogger.info(
      {
        ip,
        commandeId: inserted.id,
        numero: inserted.numero,
        restaurantId: data.restaurantId,
        total,
      },
      "Commande created successfully",
    );
    return NextResponse.json(
      { id: inserted.id, numero: inserted.numero },
      { status: 201 },
    );
  } catch (error) {
    commandeLogger.error(
      {
        ip,
        error: error instanceof Error ? error.message : "Unknown error",
        stack:
          process.env.NODE_ENV === "development" && error instanceof Error
            ? error.stack
            : undefined,
      },
      "Commande API error",
    );
    return NextResponse.json(
      { error: "Une erreur interne est survenue." },
      { status: 500 },
    );
  }
}
