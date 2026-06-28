import { asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import MenuDetailClient from "./menu-detail-client";
import { getRestaurateurSession } from "@/lib/auth/get-restaurateur-session";
import { getPlatById, getSimilarPlats } from "@/lib/db/queries";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MenuDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { restaurant } = await getRestaurateurSession();

  const plat = await getPlatById(id, restaurant.id);

  if (!plat) {
    redirect("/restaurateur/menu");
  }

  const [categoriesList, similarPlats] = await Promise.all([
    db
      .select({ id: categories.id, nom: categories.nom })
      .from(categories)
      .where(eq(categories.restaurantId, restaurant.id))
      .orderBy(asc(categories.ordre)),
    getSimilarPlats(plat.id, restaurant.id, plat.categorieId),
  ]);

  const nutrition = plat.nutrition
    ? [
        {
          label: "Calories",
          value: String(plat.nutrition.calories),
          unit: "kcal",
        },
        {
          label: "Protéines",
          value: String(plat.nutrition.proteines),
          unit: "g",
        },
        { label: "Lipides", value: String(plat.nutrition.lipides), unit: "g" },
        {
          label: "Glucides",
          value: String(plat.nutrition.glucides),
          unit: "g",
        },
      ]
    : [];

  return (
    <MenuDetailClient
      plat={plat}
      categories={categoriesList}
      similarPlats={similarPlats}
      tags={plat.tags ?? []}
      allergenes={plat.allergenes ?? []}
      nutrition={nutrition}
    />
  );
}
