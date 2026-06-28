import MenuManager from "@/components/dashboard/menu/menu-manager";
import { getCurrentUser } from "@/lib/auth";
import { parsePage } from "@/lib/config/pagination";
import { db } from "@/lib/db";
import { getPlats } from "@/lib/db/queries";
import { categories, creneauxHoraires, restaurants } from "@/lib/db/schema";
import type { Categorie, CreneauHoraire } from "@/types";
import type { PlatAvecCategorie } from "@/types/dashboard";
import { asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

const PLATS_LIMIT = 12;

export default async function RestaurateurMenuPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    categorie?: string;
    dispo?: string;
  }>;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const [restaurant] = await db
    .select()
    .from(restaurants)
    .where(eq(restaurants.userId, currentUser.userId))
    .limit(1);

  if (!restaurant) return <div>Restaurant introuvable.</div>;

  const params = await searchParams;
  const page = parsePage(params.page);
  const search = params.q?.trim() || undefined;
  const categorieId = params.categorie || undefined;

  let disponible: boolean | undefined;
  if (params.dispo === "available") disponible = true;
  if (params.dispo === "unavailable") disponible = false;

  const [categoriesList, creneauxList, platsPage] = await Promise.all([
    db
      .select()
      .from(categories)
      .where(eq(categories.restaurantId, restaurant.id))
      .orderBy(asc(categories.nom)),
    db
      .select()
      .from(creneauxHoraires)
      .where(eq(creneauxHoraires.restaurantId, restaurant.id))
      .orderBy(asc(creneauxHoraires.nom)),
    getPlats({
      restaurantId: restaurant.id,
      page,
      limit: PLATS_LIMIT,
      search,
      categorieId,
      disponible,
    }),
  ]);

  return (
    <MenuManager
      categories={categoriesList as Categorie[]}
      creneaux={creneauxList as CreneauHoraire[]}
      initialPlats={platsPage.items as PlatAvecCategorie[]}
      totalPlats={platsPage.total}
      currentPage={page}
      limit={PLATS_LIMIT}
      currentQ={search}
      currentCategorie={categorieId}
      currentDispo={params.dispo ?? "all"}
    />
  );
}
