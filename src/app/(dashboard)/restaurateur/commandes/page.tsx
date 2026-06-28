import { redirect } from "next/navigation";
import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { commandes, restaurants } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";
import CommandesPageClient from "@/components/dashboard/commandes/commandes-page-client";
import type { Commande } from "@/types";

const getStartOfDay = () => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
};

export default async function CommandesPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const restaurant = await db.query.restaurants.findFirst({
    where: eq(restaurants.userId, currentUser.userId),
  });

  if (!restaurant) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
        Restaurant introuvable.
      </div>
    );
  }

  const initialCommandes = await db
    .select()
    .from(commandes)
    .where(
      and(eq(commandes.restaurantId, restaurant.id), gte(commandes.createdAt, getStartOfDay()))
    )
    .orderBy(desc(commandes.createdAt));

  return (
    <CommandesPageClient
      initialCommandes={initialCommandes as Commande[]}
      restaurantId={restaurant.id}
    />
  );
}
