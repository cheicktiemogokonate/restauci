import { notFound } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { commandes, plats } from "@/lib/db/schema";
import { getRestaurateurSession } from "@/lib/auth/get-restaurateur-session";
import CommandeDetailsPageClient from "@/components/dashboard/commandes/commande-details-page-client";
import { commandeToDetailsView } from "@/components/dashboard/commandes/map-commande-to-details";
import type { Commande } from "@/types";
import type {
  DeliveryTrackingDetails,
  DriverDetails,
} from "@/components/dashboard/commandes/map-commande-to-details";
import { listRestaurantDrivers } from "@/modules/deliveries/server";

export default async function CommandeDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { restaurant } = await getRestaurateurSession();

  const { id } = await params;

  const commande = await db.query.commandes.findFirst({
    where: and(eq(commandes.id, id), eq(commandes.restaurantId, restaurant.id)),
  });

  if (!commande) {
    notFound();
  }

  const platIds = [...new Set(commande.items.map((item) => item.platId))];
  const [platPhotos, livraison, availableDrivers] = await Promise.all([
    platIds.length
      ? db
          .select({ id: plats.id, photoUrl: plats.photoUrl })
          .from(plats)
          .where(
            and(
              eq(plats.restaurantId, restaurant.id),
              inArray(plats.id, platIds),
            ),
          )
      : Promise.resolve([]),
    commande.modeCommande === "livraison"
      ? db.query.livraisons.findFirst({
          where: (livraisons, { eq }) => eq(livraisons.commandeId, commande.id),
          with: { livreur: true },
        })
      : Promise.resolve(undefined),
    commande.modeCommande === "livraison"
      ? listRestaurantDrivers(restaurant.id)
      : Promise.resolve([]),
  ]);
  const photoByPlatId = new Map(
    platPhotos.map((plat) => [plat.id, plat.photoUrl]),
  );
  const driver: DriverDetails | null = livraison?.livreur
    ? {
        assigned: true,
        name: livraison.livreur.nom,
        status:
          livraison.statut === "en_route"
            ? "en_livraison"
            : livraison.livreur.enLigne
              ? "en_ligne"
              : "hors_ligne",
        phone: livraison.livreur.telephone,
        vehicleType: livraison.livreur.vehicule,
        vehicleNumber: livraison.livreur.numeroVehicule,
        avatar: "",
      }
    : null;
  const deliveryTracking: DeliveryTrackingDetails | null = livraison
    ? {
        status: livraison.statut,
        assignedAt: livraison.heureAssignee,
      }
    : null;

  const order = commandeToDetailsView(
    commande as Commande,
    restaurant,
    photoByPlatId,
    driver,
    deliveryTracking,
  );
  return (
    <CommandeDetailsPageClient
      order={order}
      restaurantCoordinate={{ longitude: restaurant.longitude, latitude: restaurant.latitude }}
      customerCoordinate={
        commande.longitudeLivraison !== null && commande.latitudeLivraison !== null
          ? { longitude: commande.longitudeLivraison, latitude: commande.latitudeLivraison }
          : undefined
      }
      availableDrivers={availableDrivers
        .filter((livreur) => livreur.availability === "available")
        .map((livreur) => ({
        id: livreur.id,
        name: livreur.nom,
        vehicle: livreur.vehicule,
        isOnline: livreur.declaredAvailable,
      }))}
    />
  );
}
