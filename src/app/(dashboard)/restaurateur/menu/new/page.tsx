import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, restaurants } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";
import PlatFormWizard from "@/components/dashboard/menu/menu-form-new";

export const metadata = {
  title: "Nouveau plat",
  description: "Ajouter un plat à la carte de votre restaurant",
};

export default async function NewPlatPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const [restaurant] = await db
    .select()
    .from(restaurants)
    .where(eq(restaurants.userId, currentUser.userId))
    .limit(1);

  if (!restaurant) redirect("/restaurateur");

  const categoriesList = await db
    .select({ id: categories.id, nom: categories.nom })
    .from(categories)
    .where(eq(categories.restaurantId, restaurant.id))
    .orderBy(asc(categories.ordre));

  return <PlatFormWizard categories={categoriesList} />;
}
