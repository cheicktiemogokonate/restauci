import { redirect } from "next/navigation";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { commandes, restaurants } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";
import CommandesPageClient from "@/components/dashboard/commandes/commandes-page-client";
import type { Commande } from "@/types";
import { startOfDay, endOfDay, parseISO, isValid } from "date-fns";

export default async function CommandesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const resolvedSearchParams = await searchParams;
  const dateParam = typeof resolvedSearchParams.date === "string" ? resolvedSearchParams.date : undefined;

  let selectedDate = new Date();
  if (dateParam) {
    const parsedDate = parseISO(dateParam);
    if (isValid(parsedDate)) {
      selectedDate = parsedDate;
    }
  }

  const start = startOfDay(selectedDate);
  const end = endOfDay(selectedDate);

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
      and(
        eq(commandes.restaurantId, restaurant.id),
        gte(commandes.createdAt, start),
        lte(commandes.createdAt, end)
      )
    )
    .orderBy(desc(commandes.createdAt));

  return (
    <CommandesPageClient
      key={start.toISOString()}
      initialCommandes={initialCommandes as Commande[]}
      restaurantId={restaurant.id}
      selectedDateStr={start.toISOString()}
    />
  );
}
