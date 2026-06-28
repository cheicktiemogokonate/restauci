import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getMyRestaurant } from "@/lib/db/queries";
import { restaurants } from "@/lib/db/schema";
import { restaurantLogger } from "@/lib/loggers";
import { restaurantUpdateSchema } from "@/lib/validations/restaurant";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = await context.params;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      restaurantLogger.warn(
        { userId: session.userId, reason: "invalid json body" },
        "Restaurant update request with invalid JSON",
      );
      return NextResponse.json(
        { error: "Corps de requête invalide — JSON attendu." },
        { status: 400 },
      );
    }

    const validation = restaurantUpdateSchema.safeParse(body);

    if (!validation.success) {
      restaurantLogger.warn(
        {
          userId: session.userId,
          reason: "invalid restaurant update format",
          errors: validation.error.flatten().fieldErrors,
        },
        "Restaurant update validation failed",
      );
      return NextResponse.json(
        {
          error: "Données invalides",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const restaurant = await getMyRestaurant(session.userId);
    if (!restaurant || restaurant.id !== id) {
      return NextResponse.json(
        { error: "Restaurant introuvable ou accès refusé." },
        { status: 403 },
      );
    }

    const data = validation.data;
    const [updated] = await db
      .update(restaurants)
      .set({
        nom: data.nom,
        description: data.description ?? null,
        telephone: data.telephone,
        adresse: data.adresse,
        fraisLivraison: data.fraisLivraison,
        modesCommande: data.modesCommande,
        latitude: data.latitude,
        longitude: data.longitude,
        logoUrl: data.logoUrl ?? null,
        updatedAt: new Date(),
      })
      .where(eq(restaurants.id, id))
      .returning();

    return NextResponse.json({ restaurant: updated }, { status: 200 });
  } catch (error) {
    restaurantLogger.error(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        stack:
          process.env.NODE_ENV === "development" && error instanceof Error
            ? error.stack
            : undefined,
      },
      "Restaurant update failed",
    );
    return NextResponse.json(
      { error: "Une erreur interne est survenue." },
      { status: 500 },
    );
  }
}
