import { NextRequest, NextResponse } from "next/server";
import { getClientIp } from "@/shared/http/client-ip";
import { getCurrentUser } from "@/modules/auth/server";
import { menuLogger } from "@/infrastructure/loggers";
import { apiLimiter, checkRateLimit } from "@/infrastructure/rate-limit";
import { getPartnerAccountByUserId } from "@/modules/partners/server";
import { getRestaurantByPartnerAccountId } from "@/modules/restaurants/server";
import {
  createMenuDish,
  getMenuManagementWorkspace,
} from "@/modules/menu/server";
import { MenuDomainError } from "@/modules/menu/model";
import { menuDishPayloadSchema } from "@/modules/menu/contracts";

async function getRestaurantSession() {
  const session = await getCurrentUser();
  if (!session) return null;
  const account = await getPartnerAccountByUserId(session.userId);
  const restaurant = account
    ? await getRestaurantByPartnerAccountId(account.id)
    : null;
  return restaurant ? { session, restaurant } : null;
}

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimitResponse = await checkRateLimit(apiLimiter, ip);
  if (rateLimitResponse) return rateLimitResponse;
  const context = await getRestaurantSession();
  if (!context) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const workspace = await getMenuManagementWorkspace({
      restaurantId: context.restaurant.id,
      page: 1,
      limit: 100,
    });
    return NextResponse.json({
      plats: workspace.dishes.map((dish) => ({
        ...dish,
        categorieNom: dish.categorie.nom,
      })),
    });
  } catch (error) {
    menuLogger.error({ error, restaurantId: context.restaurant.id }, "dish list failed");
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimitResponse = await checkRateLimit(apiLimiter, ip);
  if (rateLimitResponse) return rateLimitResponse;
  const context = await getRestaurantSession();
  if (!context) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = menuDishPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const dish = await createMenuDish({
      restaurantId: context.restaurant.id,
      ownerUserId: context.session.userId,
      nom: parsed.data.nom,
      description: parsed.data.description,
      prix: parsed.data.prix,
      photoUrl: parsed.data.image,
      photoAssetId: parsed.data.imageAssetId,
      categorieId: parsed.data.categorieId,
      newCategorieName: parsed.data.categorieName,
      disponible: parsed.data.disponible,
      ordre: 0,
      tags: parsed.data.tags,
      allergenes: parsed.data.allergenes,
    });
    return NextResponse.json({ plat: dish }, { status: 201 });
  } catch (error) {
    menuLogger.error({ error, restaurantId: context.restaurant.id }, "dish creation failed");
    if (error instanceof MenuDomainError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Une erreur interne est survenue." }, { status: 500 });
  }
}
