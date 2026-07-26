import MenuManager from "@/components/dashboard/menu/menu-manager";
import { getCurrentUser } from "@/lib/auth";
import { parsePage } from "@/lib/config/pagination";
import { db } from "@/lib/db";
import { getPlats } from "@/lib/db/queries";
import { categories, plats, restaurants } from "@/lib/db/schema";
import type { Categorie } from "@/types";
import type { PlatAvecCategorie } from "@/types/dashboard";
import { asc, count, eq, sql } from "drizzle-orm";
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

  const [categoriesList, platsPage, menuStats] = await Promise.all([
    db
      .select({
        id: categories.id,
        restaurantId: categories.restaurantId,
        creneauId: categories.creneauId,
        nom: categories.nom,
        description: categories.description,
        imageUrl: categories.imageUrl,
        ordre: categories.ordre,
        visible: categories.visible,
        createdAt: categories.createdAt,
        updatedAt: categories.updatedAt,
        platCount: count(plats.id),
      })
      .from(categories)
      .leftJoin(plats, eq(plats.categorieId, categories.id))
      .where(eq(categories.restaurantId, restaurant.id))
      .groupBy(categories.id)
      .orderBy(asc(categories.nom)),
    getPlats({
      restaurantId: restaurant.id,
      page,
      limit: PLATS_LIMIT,
      search,
      categorieId,
      disponible,
    }),
    db
      .select({
        total: count(),
        disponibles: sql<number>`count(*) filter (where ${plats.disponible})`,
        indisponibles: sql<number>`count(*) filter (where not ${plats.disponible})`,
      })
      .from(plats)
      .where(eq(plats.restaurantId, restaurant.id)),
  ]);

  return (
    <MenuManager
      totalPlats={platsPage.total}
      categories={categoriesList as (Categorie & { platCount: number })[]}
      initialPlats={platsPage.items as PlatAvecCategorie[]}
      menuStats={menuStats[0] ?? { total: 0, disponibles: 0, indisponibles: 0 }}
      currentPage={page}
      limit={PLATS_LIMIT}
      currentQ={search}
      currentCategorie={categorieId}
      currentDispo={params.dispo ?? "all"}
    />
  );
}
