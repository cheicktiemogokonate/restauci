import { getRestaurateurSession } from "@/app/_shared/restaurant-session";
import { parsePage } from "@/shared/pagination";
import { getMenuManagementWorkspace } from "@/modules/menu/server";
import MenuManager from "@/modules/menu/presentation/menu-manager";
import {
  createMenuCategoryAction,
  deletePlatAction,
  renameMenuCategoryAction,
  setCategoryPublicationAction,
  setDishPublicationAction,
  toggleDisponibilitePlatAction,
  updatePlatAction,
} from "./actions";

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
  const { restaurant } = await getRestaurateurSession();
  const params = await searchParams;
  const page = parsePage(params.page);
  const search = params.q?.trim() || undefined;
  const categoryId = params.categorie || undefined;
  let disponible: boolean | undefined;
  if (params.dispo === "available") disponible = true;
  if (params.dispo === "unavailable") disponible = false;

  const workspace = await getMenuManagementWorkspace({
    restaurantId: restaurant.id,
    page,
    limit: PLATS_LIMIT,
    search,
    categoryId,
    disponible,
  });

  return (
    <MenuManager
      totalPlats={workspace.totalDishes}
      categories={workspace.categories}
      initialPlats={workspace.dishes}
      menuStats={workspace.stats}
      currentPage={workspace.page}
      limit={workspace.limit}
      currentQ={search}
      currentCategorie={categoryId}
      currentDispo={params.dispo ?? "all"}
      quotaSummary={workspace.quotaSummary}
      categoryActions={{
        create: createMenuCategoryAction,
        rename: renameMenuCategoryAction,
        setPublication: setCategoryPublicationAction,
      }}
      dishActions={{
        remove: deletePlatAction,
        update: updatePlatAction,
        setAvailability: toggleDisponibilitePlatAction,
        setPublication: setDishPublicationAction,
      }}
    />
  );
}
