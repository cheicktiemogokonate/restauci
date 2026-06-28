import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { categories, restaurants } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { getMyRestaurant } from "@/lib/db/queries";
import { checkRateLimit, apiLimiter } from "@/lib/rate-limit";
import { menuLogger } from "@/lib/loggers";

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ??
    request.headers.get("x-real-ip") ??
    "anonymous";
  const rateLimitResponse = await checkRateLimit(apiLimiter, ip);
  if (rateLimitResponse) return rateLimitResponse;

  const session = await getCurrentUser();
  if (!session) {
    menuLogger.warn({ ip, reason: "unauthorized access attempt" }, "Unauthorized categories access attempt");
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const restaurant = await getMyRestaurant(session.userId);
  if (!restaurant) {
    menuLogger.warn({ ip, userId: session?.userId ?? "unknown", reason: "restaurant not found" }, "Categories access failed");
    return NextResponse.json({ error: "Restaurant introuvable" }, { status: 404 });
  }

  menuLogger.info({ ip, restaurantId: restaurant.id }, "Fetching categories for restaurant");

  try {
    const categoriesList = await db
      .select({ id: categories.id, nom: categories.nom })
      .from(categories)
      .where(eq(categories.restaurantId, restaurant.id))
      .orderBy(asc(categories.ordre));

    menuLogger.info({ ip, restaurantId: restaurant.id, count: categoriesList.length }, "Categories fetched successfully");
    return NextResponse.json({ categories: categoriesList });
  } catch (error) {
    menuLogger.error({ 
      ip, 
      restaurantId: restaurant?.id ?? "unknown",
      error: error instanceof Error ? error.message : "Unknown error",
      stack: process.env.NODE_ENV === "development" && error instanceof Error ? error.stack : undefined
    }, "Failed to fetch categories");
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}
