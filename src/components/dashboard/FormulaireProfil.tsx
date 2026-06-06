import type { Restaurant } from "@/types"

export default function FormulaireProfil({ restaurant }: { restaurant: Restaurant }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
      <h2 className="text-xl font-semibold mb-4">Profil du Restaurant</h2>
      <p className="text-gray-500">Configuration de base pour {restaurant.nom}</p>
    </div>
  )
}
