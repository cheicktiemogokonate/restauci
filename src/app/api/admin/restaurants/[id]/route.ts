import { requireAdminSession } from "@/lib/api/auth-admin";
import {
  AdminTransitionError,
  validerRestaurant,
} from "@/lib/db/mutations-admin";
import { restaurantLogger } from "@/lib/loggers";
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
    const { session, error } = await requireAdminSession(request);
    if (error) return error;

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

    if (!validation.data.actif) {
      return NextResponse.json(
        {
          error:
            "La désactivation directe est interdite. Utilisez le flux de rejet ou de suspension.",
        },
        { status: 409 },
      );
    }

    const updated = await validerRestaurant(id, session.userId);

    if (!updated) {
      return NextResponse.json(
        { error: "Restaurant introuvable." },
        { status: 404 },
      );
    }

    return NextResponse.json({ restaurant: updated }, { status: 200 });
  } catch (error) {
    if (error instanceof AdminTransitionError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
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
