import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getMyRestaurant } from "@/lib/db/queries";
import { categories, plats } from "@/lib/db/schema";
import { menuLogger } from "@/lib/loggers";
import { apiLimiter, checkRateLimit } from "@/lib/rate-limit";
import { and, asc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createPlatSchema = z.object({
  nom: z.string().min(2, "Le nom du plat est obligatoire"),
  description: z.string().optional(),
  prix: z.number().int().positive("Le prix doit être un entier positif"),
  image: z.string().url("URL d'image invalide").optional(),
  disponible: z.boolean().optional().default(true),
  categorieId: z.string().uuid().optional(),
  categorieName: z.string().min(2).optional(),
  tags: z.array(z.string()).optional(),
  allergenes: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0] ??
    request.headers.get("x-real-ip") ??
    "anonymous";
  const rateLimitResponse = await checkRateLimit(apiLimiter, ip);
  if (rateLimitResponse) return rateLimitResponse;

  const session = await getCurrentUser();
  if (!session) {
    menuLogger.warn(
      { ip, reason: "unauthorized access attempt" },
      "Unauthorized plats access attempt",
    );
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const restaurant = await getMyRestaurant(session.userId);
  if (!restaurant) {
    menuLogger.warn(
      {
        ip,
        userId: session?.userId ?? "unknown",
        reason: "restaurant not found",
      },
      "Plats access failed",
    );
    return NextResponse.json(
      { error: "Restaurant introuvable" },
      { status: 404 },
    );
  }

  menuLogger.info(
    { ip, restaurantId: restaurant.id },
    "Fetching plats for restaurant",
  );

  try {
    const platsList = await db
      .select({
        id: plats.id,
        nom: plats.nom,
        prix: plats.prix,
        disponible: plats.disponible,
        photoUrl: plats.photoUrl,
        nombreAvis: plats.nombreAvis,
        noteMoyenne: plats.noteMoyenne,
        nombreCommandes: plats.nombreCommandes,
        categorieNom: categories.nom,
      })
      .from(plats)
      .leftJoin(categories, eq(plats.categorieId, categories.id))
      .where(eq(plats.restaurantId, restaurant.id))
      .orderBy(asc(plats.ordre));

    menuLogger.info(
      { ip, restaurantId: restaurant.id, count: platsList.length },
      "Plats fetched successfully",
    );
    return NextResponse.json({ plats: platsList });
  } catch (error) {
    menuLogger.error(
      {
        ip,
        restaurantId: restaurant?.id ?? "unknown",
        error: error instanceof Error ? error.message : "Unknown error",
        stack:
          process.env.NODE_ENV === "development" && error instanceof Error
            ? error.stack
            : undefined,
      },
      "Failed to fetch plats",
    );
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0] ??
    request.headers.get("x-real-ip") ??
    "anonymous";

  const rateLimitResponse = await checkRateLimit(apiLimiter, ip);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await getCurrentUser();
    if (!session) {
      menuLogger.warn(
        { ip, reason: "unauthorized access attempt" },
        "Unauthorized plat creation attempt",
      );
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const restaurant = await getMyRestaurant(session.userId);
    if (!restaurant) {
      menuLogger.warn(
        {
          ip,
          userId: session?.userId ?? "unknown",
          reason: "restaurant not found",
        },
        "Plat creation failed",
      );
      return NextResponse.json(
        { error: "Restaurant introuvable" },
        { status: 404 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      menuLogger.warn(
        {
          ip,
          restaurantId: restaurant?.id ?? "unknown",
          reason: "invalid json body",
        },
        "Plat creation request with invalid JSON",
      );
      return NextResponse.json(
        { error: "Corps de requête invalide — JSON attendu." },
        { status: 400 },
      );
    }

    const validation = createPlatSchema.safeParse(body);

    if (!validation.success) {
      menuLogger.warn(
        {
          ip,
          restaurantId: restaurant?.id ?? "unknown",
          reason: "invalid plat data",
          errors: validation.error.flatten().fieldErrors,
        },
        "Invalid plat creation data",
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
    menuLogger.info(
      { ip, restaurantId: restaurant.id, nom: data.nom },
      "Creating new plat",
    );

    let categorieId = data.categorieId;

    if (!categorieId) {
      if (!data.categorieName) {
        menuLogger.warn(
          {
            ip,
            restaurantId: restaurant.id,
            reason: "missing category name or id",
          },
          "Plat creation failed",
        );
        return NextResponse.json(
          { error: "La catégorie du plat est requise." },
          { status: 400 },
        );
      }

      const [existingCategory] = await db
        .select()
        .from(categories)
        .where(
          and(
            eq(categories.restaurantId, restaurant.id),
            eq(categories.nom, data.categorieName),
          ),
        )
        .limit(1);

      if (existingCategory) {
        categorieId = existingCategory.id;
        menuLogger.debug(
          { ip, restaurantId: restaurant.id, categoryId: existingCategory.id },
          "Using existing category",
        );
      } else {
        const [createdCategory] = await db
          .insert(categories)
          .values({
            restaurantId: restaurant.id,
            nom: data.categorieName,
            visible: true,
            ordre: 0,
          })
          .returning();

        categorieId = createdCategory.id;
        menuLogger.info(
          {
            ip,
            restaurantId: restaurant.id,
            categoryId: createdCategory.id,
            categoryName: data.categorieName,
          },
          "Created new category",
        );
      }
    } else {
      const [category] = await db
        .select()
        .from(categories)
        .where(
          and(
            eq(categories.id, categorieId),
            eq(categories.restaurantId, restaurant.id),
          ),
        )
        .limit(1);

      if (!category) {
        menuLogger.warn(
          {
            ip,
            restaurantId: restaurant.id,
            categoryId: categorieId,
            reason: "invalid category",
          },
          "Plat creation failed",
        );
        return NextResponse.json(
          { error: "Catégorie invalide." },
          { status: 400 },
        );
      }
      menuLogger.debug(
        { ip, restaurantId: restaurant.id, categoryId: categorieId },
        "Using provided category",
      );
    }

    const [plat] = await db
      .insert(plats)
      .values({
        restaurantId: restaurant.id,
        categorieId,
        nom: data.nom,
        description: data.description ?? null,
        prix: data.prix,
        photoUrl: data.image ?? null,
        disponible: data.disponible,
        ordre: 0,
        tags: data.tags ?? [],
        allergenes: data.allergenes ?? [],
        nutrition: null,
        nombreCommandes: 0,
        noteMoyenne: 0,
        nombreAvis: 0,
      })
      .returning();

    menuLogger.info(
      { ip, platId: plat.id, nom: plat.nom, restaurantId: restaurant.id },
      "Plat created successfully",
    );
    return NextResponse.json({ plat }, { status: 200 });
  } catch (error) {
    menuLogger.error(
      {
        ip,
        error: error instanceof Error ? error.message : "Unknown error",
        stack:
          process.env.NODE_ENV === "development" && error instanceof Error
            ? error.stack
            : undefined,
      },
      "Failed to create plat",
    );
    return NextResponse.json(
      { error: "Une erreur interne est survenue." },
      { status: 500 },
    );
  }
}
