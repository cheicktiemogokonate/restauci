import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { getRestaurateurSession } from "@/lib/auth/get-restaurateur-session";
import PlatFormWizard from "@/components/dashboard/menu/menu-form-new";

export const metadata = {
  title: "Nouveau plat",
  description: "Ajouter un plat à la carte de votre restaurant",
};

export default async function NewPlatPage() {
  const { restaurant } = await getRestaurateurSession();

  const categoriesList = await db
    .select({ id: categories.id, nom: categories.nom })
    .from(categories)
    .where(eq(categories.restaurantId, restaurant.id))
    .orderBy(asc(categories.ordre));

  return <PlatFormWizard categories={categoriesList} />;
}
