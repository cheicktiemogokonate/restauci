import { getRestaurateurSession } from "@/app/_shared/restaurant-session";
import { getRestaurantSchedules } from "@/modules/restaurants/server";
import FormulaireProfil from "@/modules/restaurants/presentation/formulaire-profil";
import OpeningHoursManager from "@/modules/restaurants/presentation/opening-hours-manager";
import {
  deleteOpeningHoursAction,
  geocodeRestaurantAddressAction,
  saveOpeningHoursAction,
  setRestaurantOnlineAction,
  setRestaurantOrderAcceptanceAction,
  toggleOpeningHoursAction,
  updateRestaurantAction,
} from "../actions";

export default async function RestaurateurProfilPage() {
  const { restaurant } = await getRestaurateurSession();
  const schedules = await getRestaurantSchedules(restaurant.id);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
      <FormulaireProfil
        restaurant={restaurant}
        actions={{
          update: updateRestaurantAction,
          setOnline: setRestaurantOnlineAction,
          setOrderAcceptance: setRestaurantOrderAcceptanceAction,
          geocode: geocodeRestaurantAddressAction,
        }}
      />
      <OpeningHoursManager
        initialCreneaux={schedules}
        actions={{
          save: saveOpeningHoursAction,
          toggle: toggleOpeningHoursAction,
          remove: deleteOpeningHoursAction,
        }}
      />
    </div>
  );
}
