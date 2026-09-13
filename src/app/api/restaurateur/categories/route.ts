import { NextRequest, NextResponse } from "next/server";
import { getClientIp } from "@/shared/http/client-ip";
import { getCurrentUser } from "@/modules/auth/server";
import { menuLogger } from "@/infrastructure/loggers";
import { apiLimiter, checkRateLimit } from "@/infrastructure/rate-limit";
import { getPartnerAccountByUserId } from "@/modules/partners/server";
import { getRestaurantByPartnerAccountId } from "@/modules/restaurants/server";
import { getMenuCategoryOptions } from "@/modules/menu/server";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimitResponse = await checkRateLimit(apiLimiter, ip);
  if (rateLimitResponse) return rateLimitResponse;

  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const account = await getPartnerAccountByUserId(session.userId);
  const restaurant = account
    ? await getRestaurantByPartnerAccountId(account.id)
    : null;
  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant introuvable" }, { status: 404 });
  }

  try {
    const categories = await getMenuCategoryOptions(restaurant.id);
    return NextResponse.json({ categories });
  } catch (error) {
    menuLogger.error({ error, restaurantId: restaurant.id }, "category list failed");
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}
