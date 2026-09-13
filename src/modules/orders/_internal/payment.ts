import "server-only";

import { and, eq } from "drizzle-orm";
import { commandes } from "@/infrastructure/db/schema";
import type { TransactionExecutor } from "@/infrastructure/db";
import { recordMenuDishOrdersAccepted } from "@/modules/menu/server";
import { recordRestaurantOrderAccepted } from "@/modules/restaurants/server";

export async function releasePaidRestaurantOrderInTransaction(
  tx: TransactionExecutor,
  orderId: string,
  now = new Date(),
) {
  const [order] = await tx.update(commandes).set({ statut: "recue", updatedAt: now }).where(and(
    eq(commandes.id, orderId),
    eq(commandes.statut, "en_attente_paiement"),
  )).returning();
  if (!order) return null;
  await recordRestaurantOrderAccepted(order.restaurantId, tx);
  if (order.items.length > 0) {
    await recordMenuDishOrdersAccepted(
      order.restaurantId,
      order.items.map((item) => ({
        dishId: item.platId,
        quantity: item.quantite,
      })),
      tx,
    );
  }
  return order;
}
