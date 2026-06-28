import { getCurrentUser } from "@/lib/auth";
import { db, pool } from "@/lib/db";
import { getMyRestaurant } from "@/lib/db/queries";
import { commandes } from "@/lib/db/schema";
import { commandeLogger } from "@/lib/loggers";
import { commandeStatutSchema } from "@/lib/validations/commande";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0] ??
    request.headers.get("x-real-ip") ??
    "anonymous";

  try {
    const session = await getCurrentUser();
    if (!session || session.role !== "restaurateur") {
      commandeLogger.warn(
        { ip, reason: "unauthorized access attempt" },
        "Unauthorized status update attempt",
      );
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      commandeLogger.warn(
        { ip, reason: "invalid json body" },
        "Commande status update request with invalid JSON",
      );
      return NextResponse.json(
        { error: "Corps de requête invalide — JSON attendu." },
        { status: 400 },
      );
    }

    const validation = commandeStatutSchema.safeParse(body);
    if (!validation.success) {
      commandeLogger.warn(
        {
          ip,
          reason: "invalid status format",
          errors: validation.error.flatten().fieldErrors,
        },
        "Invalid status update format",
      );
      return NextResponse.json(
        {
          error: "Données invalides",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { id: commandeId } = await context.params;

    commandeLogger.info(
      { ip, commandeId, statut: validation.data.statut },
      "Status update attempt",
    );

    const restaurant = await getMyRestaurant(session.userId);
    if (!restaurant) {
      commandeLogger.warn(
        { ip, userId: session.userId, reason: "restaurant not found" },
        "Status update failed",
      );
      return NextResponse.json(
        { error: "Restaurant introuvable" },
        { status: 404 },
      );
    }

    const [existingCommande] = await db
      .select()
      .from(commandes)
      .where(eq(commandes.id, commandeId))
      .limit(1);

    if (!existingCommande) {
      commandeLogger.warn(
        { ip, commandeId, reason: "commande not found" },
        "Status update failed",
      );
      return NextResponse.json(
        { error: "Commande introuvable." },
        { status: 404 },
      );
    }

    if (existingCommande.restaurantId !== restaurant.id) {
      commandeLogger.warn(
        {
          ip,
          commandeId,
          restaurantId: restaurant.id,
          commandeRestaurantId: existingCommande.restaurantId,
          reason: "access denied",
        },
        "Status update failed",
      );
      return NextResponse.json(
        { error: "Accès refusé pour cette commande." },
        { status: 403 },
      );
    }

    const [updatedCommande] = await db
      .update(commandes)
      .set({ statut: validation.data.statut, updatedAt: new Date() })
      .where(eq(commandes.id, commandeId))
      .returning();

    const pgClient = await pool.connect();
    try {
      await pgClient.query("SELECT pg_notify($1, $2)", [
        "nouvelle_commande",
        JSON.stringify({ restaurantId: restaurant.id, commandeId }),
      ]);
    } catch (notifyError) {
      commandeLogger.error(
        {
          ip,
          commandeId,
          error:
            notifyError instanceof Error
              ? notifyError.message
              : "Unknown error",
        },
        "pg_notify error during status update",
      );
    } finally {
      pgClient.release();
    }

    commandeLogger.info(
      { ip, commandeId: updatedCommande.id, statut: updatedCommande.statut },
      "Status updated successfully",
    );
    return NextResponse.json({ commande: updatedCommande }, { status: 200 });
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
      "Commande status update failed",
    );
    return NextResponse.json(
      { error: "Une erreur interne est survenue." },
      { status: 500 },
    );
  }
}
