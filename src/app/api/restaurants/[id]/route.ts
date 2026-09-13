import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/modules/auth/server";
import { restaurantLogger } from "@/infrastructure/loggers";
import { getPartnerAccountByUserId } from "@/modules/partners/server";
import {
  changeRestaurantLocation,
  getRestaurantByPartnerAccountId,
  updateRestaurantProfile,
} from "@/modules/restaurants/server";
import { restaurantUpdateSchema } from "@/modules/restaurants/contracts";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    const account = await getPartnerAccountByUserId(session.userId);
    const restaurant = account
      ? await getRestaurantByPartnerAccountId(account.id)
      : null;
    const { id } = await context.params;
    if (!restaurant || restaurant.id !== id) {
      return NextResponse.json(
        { error: "Restaurant introuvable ou accès refusé." },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => null);
    const validation = restaurantUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Données invalides",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { adresse, latitude, longitude, pays, ville, ...profile } =
      validation.data;
    const locationTouched =
      adresse !== undefined || latitude !== undefined || longitude !== undefined;
    if (locationTouched) {
      if (
        adresse === undefined ||
        latitude === undefined ||
        longitude === undefined
      ) {
        return NextResponse.json(
          { error: "L'adresse et ses coordonnées doivent être modifiées ensemble." },
          { status: 400 },
        );
      }
      await changeRestaurantLocation({
        restaurantId: restaurant.id,
        adresse,
        latitude,
        longitude,
        pays: pays || undefined,
      });
    }
    await updateRestaurantProfile(
      restaurant.id,
      ville === undefined ? profile : { ...profile, ville },
      { ownerUserId: session.userId },
    );
    const updated = await getRestaurantByPartnerAccountId(account!.id);
    return NextResponse.json({ restaurant: updated }, { status: 200 });
  } catch (error) {
    restaurantLogger.error({ error }, "restaurant update failed");
    return NextResponse.json(
      { error: "Une erreur interne est survenue." },
      { status: 500 },
    );
  }
}
