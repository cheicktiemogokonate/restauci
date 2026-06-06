import { NextRequest, NextResponse } from "next/server";
import { db, pool } from "@/lib/db";
import { commandes, plats, restaurants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { haversineDistance } from "@/lib/utils/geo";
import { commandeSchema } from "@/lib/validations/commande";

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = commandeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = validation.data;

    const [restaurant] = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.id, data.restaurantId))
      .limit(1);

    if (!restaurant || restaurant.actif === false) {
      return NextResponse.json(
        { error: "Restaurant introuvable ou inactif." },
        { status: 404 }
      );
    }

    if (data.modeCommande === "livraison" && !data.telephoneClient?.trim()) {
      return NextResponse.json(
        { error: "Le téléphone est requis pour une livraison." },
        { status: 400 }
      );
    }

    if (data.modeCommande === "sur_place" && !data.numeroTable?.trim()) {
      return NextResponse.json(
        { error: "Le numéro de table est requis pour les commandes sur place." },
        { status: 400 }
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
      })
    );

    if (platRecords.some((plat) => !plat || plat?.restaurantId !== data.restaurantId)) {
      return NextResponse.json(
        { error: "Un ou plusieurs plats sont invalides pour ce restaurant." },
        { status: 400 }
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
      0
    );

    let fraisLivraison = 0;
    let distanceKm: number | null = null;

    if (data.modeCommande === "livraison" && data.latitudeLivraison != null && data.longitudeLivraison != null) {
      const distance = haversineDistance(
        { latitude: data.latitudeLivraison, longitude: data.longitudeLivraison },
        { latitude: restaurant.latitude, longitude: restaurant.longitude }
      );
      distanceKm = distance.distanceKm;
      fraisLivraison = Math.max(500, Math.round(distanceKm * 200));
    }

    const total = sousTotal + fraisLivraison;
    const numero = `CMD-${formatDate(new Date())}-${String(
      Math.floor(Math.random() * 10000)
    ).padStart(4, "0")}`;

    const [inserted] = await db
      .insert(commandes)
      .values({
        numero,
        restaurantId: data.restaurantId,
        clientId: null,
        modeCommande: data.modeCommande,
        statut: "recue",
        numeroTable: data.modeCommande === "sur_place" ? data.numeroTable : null,
        nomClient: data.nomClient.trim(),
        telephoneClient: data.telephoneClient?.trim() ?? null,
        adresseLivraison:
          data.modeCommande === "livraison"
            ? data.adresseLivraison?.trim() ?? null
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
        JSON.stringify({ restaurantId: data.restaurantId, commandeId: inserted.id }),
      ]);
    } catch (notifyError) {
      console.error("Erreur pg_notify:", notifyError);
    } finally {
      pgClient.release();
    }

    return NextResponse.json(
      { id: inserted.id, numero: inserted.numero },
      { status: 201 }
    );
  } catch (error) {
    console.error("Commande API error:", error);
    return NextResponse.json(
      { error: "Une erreur interne est survenue." },
      { status: 500 }
    );
  }
}
