import "server-only";

import { eq, sql } from "drizzle-orm";
import type { TransactionExecutor } from "@/infrastructure/db";
import { restaurants } from "@/infrastructure/db/schema";

export function incrementRestaurantOrderCountRecord(
  restaurantId: string,
  tx: TransactionExecutor,
) {
  return tx
    .update(restaurants)
    .set({
      nombreCommandes: sql`${restaurants.nombreCommandes} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(restaurants.id, restaurantId));
}
