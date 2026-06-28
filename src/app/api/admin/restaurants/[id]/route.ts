import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { restaurants } from "@/lib/db/schema";
import { restaurantLogger } from "@/lib/loggers";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const AdminRestaurantPatchSchema = z.object({
  actif: z.boolean(),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const { id } = await context.params;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      restaurantLogger.warn(
        { userId: session.userId, reason: "invalid json body" },
        "Admin restaurant patch invalid JSON",
      );
      return NextResponse.json(
        { error: "Corps de requête invalide — JSON attendu." },
        { status: 400 },
      );
    }

    const validation = AdminRestaurantPatchSchema.safeParse(body);

    if (!validation.success) {
      restaurantLogger.warn(
        {
          userId: session.userId,
          reason: "invalid admin restaurant patch format",
          errors: validation.error.flatten().fieldErrors,
        },
        "Admin restaurant patch validation failed",
      );
      return NextResponse.json(
        {
          error: "Données invalides",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const [updated] = await db
      .update(restaurants)
      .set({ actif: validation.data.actif, updatedAt: new Date() })
      .where(eq(restaurants.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Restaurant introuvable." },
        { status: 404 },
      );
    }

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
      "Admin restaurant patch failed",
    );
    return NextResponse.json(
      { error: "Une erreur interne est survenue." },
      { status: 500 },
    );
  }
}
