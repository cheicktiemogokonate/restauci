import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { restaurants } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { getCurrentUser } from "@/lib/auth"
import { restaurantSchema } from "@/lib/validations/restaurant"

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const body = await request.json()
  const validation = restaurantSchema.safeParse(body)

  if (!validation.success) {
    return NextResponse.json(
      { error: "Données invalides", details: validation.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const [restaurant] = await db
    .select()
    .from(restaurants)
    .where(
      and(eq(restaurants.id, id), eq(restaurants.userId, currentUser.userId))
    )
    .limit(1)

  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant introuvable ou accès refusé." }, { status: 403 })
  }

  const data = validation.data
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
    .returning()

  return NextResponse.json({ restaurant: updated }, { status: 200 })
}
