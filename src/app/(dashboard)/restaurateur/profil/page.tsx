import FormulaireProfil from "@/components/dashboard/profil/formulaire-profil";
import OpeningHoursManager from "@/components/dashboard/profil/opening-hours-manager";
import { getRestaurateurSession } from "@/lib/auth/get-restaurateur-session";
import { db } from "@/lib/db";
import { creneauxHoraires } from "@/lib/db/schema";
import type { Restaurant } from "@/types";
import { asc, eq } from "drizzle-orm";

export default async function RestaurateurProfilPage() {
  const { restaurant } = await getRestaurateurSession();

  const creneaux = await db
    .select()
    .from(creneauxHoraires)
    .where(eq(creneauxHoraires.restaurantId, restaurant.id))
    .orderBy(asc(creneauxHoraires.heureOuverture));

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
      <FormulaireProfil restaurant={restaurant as Restaurant} />
      <OpeningHoursManager initialCreneaux={creneaux} />
    </div>
  );
}
