import { NextRequest, NextResponse } from "next/server";
import { db, pool } from "@/lib/db";
import { restaurants, commandes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { commandeStatutSchema } from "@/lib/validations/commande";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "restaurateur") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const validation = commandeStatutSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Données invalides", details: validation.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { id: commandeId } = await context.params;

  const [restaurant] = await db
    .select()
    .from(restaurants)
    .where(eq(restaurants.userId, currentUser.userId))
    .limit(1);

  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant introuvable." }, { status: 404 });
  }

  const [existingCommande] = await db
    .select()
    .from(commandes)
    .where(eq(commandes.id, commandeId))
    .limit(1);

  if (!existingCommande) {
    return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
  }

  if (existingCommande.restaurantId !== restaurant.id) {
    return NextResponse.json({ error: "Accès refusé pour cette commande." }, { status: 403 });
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
    console.error("Erreur pg_notify lors de la mise à jour du statut:", notifyError);
  } finally {
    pgClient.release();
  }

  return NextResponse.json({ commande: updatedCommande }, { status: 200 });
}
