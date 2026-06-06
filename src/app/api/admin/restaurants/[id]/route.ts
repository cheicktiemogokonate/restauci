import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { restaurants } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getCurrentUser } from "@/lib/auth"

const AdminRestaurantPatchSchema = z.object({
  actif: z.boolean(),
})

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await context.params
  const body = await request.json()
  const validation = AdminRestaurantPatchSchema.safeParse(body)

  if (!validation.success) {
    return NextResponse.json(
      { error: "Données invalides", details: validation.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const [updated] = await db
    .update(restaurants)
    .set({ actif: validation.data.actif, updatedAt: new Date() })
    .where(eq(restaurants.id, id))
    .returning()

  if (!updated) {
    return NextResponse.json({ error: "Restaurant introuvable." }, { status: 404 })
  }

  return NextResponse.json({ restaurant: updated }, { status: 200 })
}
