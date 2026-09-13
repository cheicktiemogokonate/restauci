import { endOfDay, isValid, parseISO, startOfDay } from "date-fns";
import { getRestaurateurSession } from "@/app/_shared/restaurant-session";
import { commandeLogger } from "@/infrastructure/loggers";
import CommandesPageClient from "@/modules/orders/presentation/commandes-page-client";
import { listRestaurantOrders } from "@/modules/orders/server";
import type { Commande } from "@/types";

const HISTORY_PAGE_SIZE = 6;
const HISTORY_STATUSES = ["all", "servie", "annulee"] as const;
const HISTORY_MODES = ["all", "sur_place", "emporter", "livraison"] as const;

function getSingleParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function CommandesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { restaurant } = await getRestaurateurSession();
  const params = await searchParams;
  const dateParam = getSingleParam(params.date);
  const historySearch =
    getSingleParam(params.historySearch)?.trim().slice(0, 100) ?? "";
  const statusParam = getSingleParam(params.historyStatus);
  const modeParam = getSingleParam(params.historyMode);
  const historyStatus = HISTORY_STATUSES.includes(
    statusParam as (typeof HISTORY_STATUSES)[number],
  )
    ? (statusParam as (typeof HISTORY_STATUSES)[number])
    : "all";
  const historyMode = HISTORY_MODES.includes(
    modeParam as (typeof HISTORY_MODES)[number],
  )
    ? (modeParam as (typeof HISTORY_MODES)[number])
    : "all";
  const parsedPage = Number(getSingleParam(params.historyPage));
  const historyPage =
    Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  let selectedDate = new Date();
  if (dateParam) {
    const parsed = parseISO(dateParam);
    if (isValid(parsed)) selectedDate = parsed;
  }
  const start = startOfDay(selectedDate);
  const end = endOfDay(selectedDate);

  const [day, history] = await Promise.all([
      listRestaurantOrders(restaurant.id, {
        dateDebut: start,
        dateFin: end,
        page: 1,
        limit: 100,
      }),
      listRestaurantOrders(restaurant.id, {
        lifecycle: "history",
        statut: historyStatus === "all" ? undefined : historyStatus,
        modeCommande: historyMode === "all" ? undefined : historyMode,
        search: historySearch || undefined,
        page: historyPage,
        limit: HISTORY_PAGE_SIZE,
      }),
    ]).catch((error: unknown) => {
    commandeLogger.error(
      {
        error,
        restaurantId: restaurant.id,
        selectedDate: start.toISOString(),
      },
      "Échec de chargement des commandes restaurateur",
    );
    throw error;
  });

  return (
    <CommandesPageClient
      key={start.toISOString()}
      initialCommandes={day.items as Commande[]}
      initialHistoryCommandes={history.items as Commande[]}
      historyTotal={history.total}
      historyPage={historyPage}
      historySearch={historySearch}
      historyStatus={historyStatus}
      historyMode={historyMode}
      restaurantId={restaurant.id}
      selectedDateStr={start.toISOString()}
      assignedDeliveryCommandeIds={day.items
        .filter((order) => order.livraison?.livreurId)
        .map((order) => order.id)}
    />
  );
}
