import { redirect } from "next/navigation";
import { and, count, desc, eq, gte, ilike, inArray, lte, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { commandes, livraisons, restaurants } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { commandeLogger } from "@/lib/loggers";
import CommandesPageClient from "@/components/dashboard/commandes/commandes-page-client";
import type { Commande } from "@/types";
import { startOfDay, endOfDay, parseISO, isValid } from "date-fns";

const HISTORY_PAGE_SIZE = 6;
const HISTORY_STATUSES = ["all", "servie", "annulee"] as const;
const HISTORY_MODES = ["all", "sur_place", "emporter", "livraison"] as const;

function getSingleParam(
  value: string | string[] | undefined,
): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export default async function CommandesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const resolvedSearchParams = await searchParams;
  const dateParam = getSingleParam(resolvedSearchParams.date);
  const historySearch = getSingleParam(resolvedSearchParams.historySearch)
    ?.trim()
    .slice(0, 120) ?? "";
  const historyStatusParam = getSingleParam(resolvedSearchParams.historyStatus);
  const historyModeParam = getSingleParam(resolvedSearchParams.historyMode);
  const historyStatus = HISTORY_STATUSES.includes(
    historyStatusParam as (typeof HISTORY_STATUSES)[number],
  )
    ? (historyStatusParam as (typeof HISTORY_STATUSES)[number])
    : "all";
  const historyMode = HISTORY_MODES.includes(
    historyModeParam as (typeof HISTORY_MODES)[number],
  )
    ? (historyModeParam as (typeof HISTORY_MODES)[number])
    : "all";
  const parsedHistoryPage = Number(getSingleParam(resolvedSearchParams.historyPage));
  const historyPage = Number.isInteger(parsedHistoryPage) && parsedHistoryPage > 0
    ? parsedHistoryPage
    : 1;

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

  const historyConditions = [
    eq(commandes.restaurantId, restaurant.id),
    inArray(commandes.statut, ["servie", "annulee"]),
  ];
  if (historyStatus !== "all") {
    historyConditions.push(eq(commandes.statut, historyStatus));
  }
  if (historyMode !== "all") {
    historyConditions.push(eq(commandes.modeCommande, historyMode));
  }
  if (historySearch) {
    const pattern = `%${historySearch.replace(/[\\%_]/g, "\\$&")}%`;
    historyConditions.push(
      or(
        ilike(commandes.numero, pattern),
        ilike(commandes.nomClient, pattern),
        ilike(commandes.telephoneClient, pattern),
      )!,
    );
  }

  let initialCommandes;
  let initialHistoryCommandes;
  let historyTotalResult;
  try {
    [initialCommandes, initialHistoryCommandes, historyTotalResult] =
      await Promise.all([
        db
          .select()
          .from(commandes)
          .where(
            and(
              eq(commandes.restaurantId, restaurant.id),
              gte(commandes.createdAt, start),
              lte(commandes.createdAt, end),
            ),
          )
          .orderBy(desc(commandes.createdAt)),
        db
          .select()
          .from(commandes)
          .where(and(...historyConditions))
          .orderBy(desc(commandes.createdAt))
          .limit(HISTORY_PAGE_SIZE)
          .offset((historyPage - 1) * HISTORY_PAGE_SIZE),
        db
          .select({ total: count() })
          .from(commandes)
          .where(and(...historyConditions)),
      ]);
  } catch (error) {
    commandeLogger.error(
      {
        error,
        restaurantId: restaurant.id,
        selectedDate: selectedDate.toISOString(),
        historyPage,
        historyStatus,
        historyMode,
        hasHistorySearch: Boolean(historySearch),
      },
      "Échec de chargement des commandes restaurateur",
    );
    throw error;
  }
  const deliveryCommandeIds = initialCommandes
    .filter((commande) => commande.modeCommande === "livraison")
    .map((commande) => commande.id);
  const deliveryAssignments = deliveryCommandeIds.length
    ? await db
        .select({ commandeId: livraisons.commandeId, livreurId: livraisons.livreurId })
        .from(livraisons)
        .where(inArray(livraisons.commandeId, deliveryCommandeIds))
    : [];
  const assignedDeliveryCommandeIds = deliveryAssignments
    .filter((delivery) => delivery.livreurId !== null)
    .map((delivery) => delivery.commandeId);

  return (
    <CommandesPageClient
      key={start.toISOString()}
      initialCommandes={initialCommandes as Commande[]}
      initialHistoryCommandes={initialHistoryCommandes as Commande[]}
      historyTotal={historyTotalResult[0]?.total ?? 0}
      historyPage={historyPage}
      historySearch={historySearch}
      historyStatus={historyStatus}
      historyMode={historyMode}
      restaurantId={restaurant.id}
      selectedDateStr={start.toISOString()}
      assignedDeliveryCommandeIds={assignedDeliveryCommandeIds}
    />
  );
}
