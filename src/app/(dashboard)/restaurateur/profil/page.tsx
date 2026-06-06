import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { restaurants } from "@/lib/db/schema"
import { getCurrentUser } from "@/lib/auth"
import { eq } from "drizzle-orm"
import FormulaireProfil from "@/components/dashboard/FormulaireProfil"
import type { Restaurant } from "@/types"

export default async function RestaurateurProfilPage() {
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    redirect("/login")
  }

  const [restaurant] = await db
    .select()
    .from(restaurants)
    .where(eq(restaurants.userId, currentUser.userId))
    .limit(1)

  if (!restaurant) {
    return <div>Restaurant introuvable.</div>
  }

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <FormulaireProfil restaurant={restaurant as Restaurant} />
    </div>
  )
}
