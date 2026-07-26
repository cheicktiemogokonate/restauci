import { getCommandesParJour } from "@/lib/db/queries";
import { cache } from "react";

/**
 * Une même agrégation alimente les deux graphiques quotidiens du dashboard.
 * `cache` déduplique la promesse pendant le rendu RSC courant, tandis que la
 * couche Redis protège les rechargements rapprochés.
 */
export const getDashboardDailyData = cache((restaurantId: string) =>
  getCommandesParJour(restaurantId, 7),
);
