"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface RestaurantAdminRow {
  id: string
  nom: string
  slug: string
  actif: boolean
  commandesCount: number
}

export default function RestaurantsManager({
  initialRestaurants,
}: {
  initialRestaurants: RestaurantAdminRow[]
}) {
  const [restaurants, setRestaurants] = useState<RestaurantAdminRow[]>(initialRestaurants)
  const [error, setError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  const handleToggle = async (id: string, actif: boolean) => {
    setError(null)
    setSavingId(id)

    try {
      const response = await fetch(`/api/admin/restaurants/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actif }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || "Impossible de modifier le statut.")
      }

      setRestaurants((current) =>
        current.map((restaurant) =>
          restaurant.id === id
            ? { ...restaurant, actif: data.restaurant.actif }
            : restaurant
        )
      )
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Erreur inconnue.")
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Actif</TableHead>
              <TableHead>Commandes</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {restaurants.map((restaurant) => (
              <TableRow key={restaurant.id}>
                <TableCell>{restaurant.nom}</TableCell>
                <TableCell>{restaurant.slug}</TableCell>
                <TableCell>
                  <Badge variant={restaurant.actif ? "secondary" : "destructive"}>
                    {restaurant.actif ? "Actif" : "Inactif"}
                  </Badge>
                </TableCell>
                <TableCell>{restaurant.commandesCount}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={restaurant.actif}
                      onCheckedChange={(checked) => handleToggle(restaurant.id, checked)}
                      disabled={savingId === restaurant.id}
                      aria-label={`Activer ${restaurant.nom}`}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled
                    >
                      {savingId === restaurant.id ? "Mise à jour..." : "Changer"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
