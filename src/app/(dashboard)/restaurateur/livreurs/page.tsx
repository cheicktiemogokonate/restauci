import { FleetPageClient } from "@/components/dashboard/livreurs/fleet-page-client";
import { getRestaurateurSession } from "@/lib/auth/get-restaurateur-session";
import { listRestaurantDrivers } from "@/modules/deliveries/server";

export default async function RestaurantDriversPage() {
  const { restaurant } = await getRestaurateurSession();
  const drivers = await listRestaurantDrivers(restaurant.id);
  return <FleetPageClient drivers={drivers} />;
}
