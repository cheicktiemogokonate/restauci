import { redirect } from "next/navigation";
import { getRestaurateurSession } from "@/app/_shared/restaurant-session";
import { getMenuDishDetailWorkspace } from "@/modules/menu/server";
import MenuDetailClient from "@/modules/menu/presentation/menu-detail-client";
import {
  deletePlatAction,
  setDishPublicationAction,
  toggleDisponibilitePlatAction,
  updatePlatAction,
} from "../actions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MenuDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { restaurant } = await getRestaurateurSession();
  const workspace = await getMenuDishDetailWorkspace(id, restaurant.id);
  if (!workspace) redirect("/restaurateur/menu");

  return (
    <MenuDetailClient
      plat={workspace.dish}
      categories={workspace.categories}
      similarPlats={workspace.similarDishes}
      tags={workspace.dish.tags}
      actions={{
        remove: deletePlatAction,
        update: updatePlatAction,
        setAvailability: toggleDisponibilitePlatAction,
        setPublication: setDishPublicationAction,
      }}
    />
  );
}
