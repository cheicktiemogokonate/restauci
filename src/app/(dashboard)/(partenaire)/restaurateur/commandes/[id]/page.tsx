import { notFound } from "next/navigation";
import { getRestaurateurSession } from "@/app/_shared/restaurant-session";
import CommandeDetailsPageClient from "@/modules/orders/presentation/commande-details-page-client";
import { commandeToDetailsView } from "@/modules/orders/presentation/map-commande-to-details";
import type { Commande } from "@/types";
import type {
  DeliveryTrackingDetails,
  DriverDetails,
} from "@/modules/orders/presentation/map-commande-to-details";
import {
  getRestaurantDelivery,
  listRestaurantDrivers,
} from "@/modules/deliveries/server";
import { getMenuDishPhotos } from "@/modules/menu/server";
import { getRestaurantOrder } from "@/modules/orders/server";
import {
  assignCommandeDriver,
  updateCommandeStatus,
} from "@/app/_actions/commandes";

export default async function CommandeDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { restaurant } = await getRestaurateurSession();

  const { id } = await params;

  const commande = await getRestaurantOrder(id, restaurant.id);

  if (!commande) {
    notFound();
  }

  const platIds = [...new Set(commande.items.map((item) => item.platId))];
  const [platPhotos, livraison, availableDrivers] = await Promise.all([
    getMenuDishPhotos(restaurant.id, platIds),
    commande.modeCommande === "livraison"
      ? getRestaurantDelivery(restaurant.id, commande.id)
      : Promise.resolve(undefined),
    commande.modeCommande === "livraison"
      ? listRestaurantDrivers(restaurant.id)
      : Promise.resolve([]),
  ]);
  const photoByPlatId = new Map(
    platPhotos.map((plat) => [plat.id, plat.photoUrl]),
  );
  const driver: DriverDetails | null = livraison?.driver
    ? {
        assigned: true,
        name: livraison.driver.nom,
        status:
          livraison.status === "en_route"
            ? "en_livraison"
            : "en_ligne",
        phone: livraison.driver.telephone,
        vehicleType: livraison.driver.vehicule,
        vehicleNumber: livraison.driver.numeroVehicule,
        avatar: "",
      }
    : null;
  const deliveryTracking: DeliveryTrackingDetails | null = livraison
    ? {
        status: livraison.status,
        assignedAt: livraison.assignedAt
          ? new Date(livraison.assignedAt)
          : null,
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
      onUpdateStatus={updateCommandeStatus}
      onAssignDriver={assignCommandeDriver}
    />
  );
}
