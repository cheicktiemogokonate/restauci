import { redirect } from "next/navigation"
import { pool } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import RestaurantsManager from "@/components/admin/RestaurantsManager"
import type { Restaurant } from "@/types"

interface RestaurantAdminRow {
  id: string
  nom: string
  slug: string
  actif: boolean
  commandesCount: number
}

export default async function AdminRestaurantsPage() {
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.role !== "admin") {
    redirect("/login")
  }

  const result = await pool.query<RestaurantAdminRow>(
    `SELECT r.id, r.nom, r.slug, r.actif, COUNT(c.id)::int AS commandes_count
     FROM restaurants r
     LEFT JOIN commandes c ON c.restaurant_id = r.id
     GROUP BY r.id
     ORDER BY r.nom`
  )

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Administration</p>
        <h1 className="text-3xl font-semibold text-slate-900">Restaurants</h1>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          Gérez l’état des restaurants et consultez le nombre de commandes enregistrées.
        </p>
      </div>

      <RestaurantsManager initialRestaurants={result.rows} />
    </div>
  )
}
