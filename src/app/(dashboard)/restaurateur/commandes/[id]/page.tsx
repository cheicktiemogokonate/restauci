import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { commandes, restaurants } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";
import CommandeDetailsPageClient from "@/components/dashboard/commandes/commande-details-page-client";
import { commandeToDetailsView } from "@/components/dashboard/commandes/map-commande-to-details";
import type { Commande } from "@/types";

export default async function CommandeDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const { id } = await params;

  const restaurant = await db.query.restaurants.findFirst({
    where: eq(restaurants.userId, currentUser.userId),
  });

  if (!restaurant) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
        Restaurant introuvable.
      </div>
    );
  }

  const commande = await db.query.commandes.findFirst({
    where: and(eq(commandes.id, id), eq(commandes.restaurantId, restaurant.id)),
  });

  if (!commande) {
    notFound();
  }

  const order = commandeToDetailsView(commande as Commande, restaurant);
  console.log("Détails de la commande :", commande);

  return (
    <CommandeDetailsPageClient
      order={order}
      restaurantCoordinate={{ longitude: restaurant.longitude, latitude: restaurant.latitude }}
      customerCoordinate={
        commande.longitudeLivraison !== null && commande.latitudeLivraison !== null
          ? { longitude: commande.longitudeLivraison, latitude: commande.latitudeLivraison }
          : undefined
      }
    />
  );
}
