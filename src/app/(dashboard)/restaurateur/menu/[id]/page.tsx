import { asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import MenuDetailClient from "./menu-detail-client";
import { getRestaurateurSession } from "@/lib/auth/get-restaurateur-session";
import { getPlatById, getSimilarPlats } from "@/lib/db/queries";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { getRestaurantQuotaEligibility } from "@/lib/quota-entitlements";

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

  const [categoriesList, similarPlats, eligibility] = await Promise.all([
    db
      .select({ id: categories.id, nom: categories.nom })
      .from(categories)
      .where(eq(categories.restaurantId, restaurant.id))
      .orderBy(asc(categories.ordre)),
    getSimilarPlats(plat.id, restaurant.id, plat.categorieId),
    getRestaurantQuotaEligibility(restaurant.id),
  ]);

  return (
    <MenuDetailClient
      plat={{
        ...plat,
        quotaEligible: eligibility.dishIds.has(plat.id),
        categoryQuotaEligible: eligibility.categoryIds.has(plat.categorieId),
      }}
      categories={categoriesList}
      similarPlats={similarPlats}
      tags={plat.tags ?? []}
    />
  );
}
