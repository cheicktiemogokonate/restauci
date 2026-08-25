import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { commandes, restaurants } from "@/lib/db/schema";
import type { TransactionExecutor } from "@/lib/db/transaction";

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
  await tx.update(restaurants).set({
    nombreCommandes: sql`${restaurants.nombreCommandes} + 1`,
    updatedAt: now,
  }).where(eq(restaurants.id, order.restaurantId));
  if (order.items.length > 0) {
    const requestedItems = sql.join(order.items.map((item) => sql`(${item.platId}, ${item.quantite})`), sql`, `);
    await tx.execute(sql`
      UPDATE "plats" AS dish
      SET "nombre_commandes" = dish."nombre_commandes" + requested.quantity::integer,
          "updated_at" = ${now}
      FROM (VALUES ${requestedItems}) AS requested(id, quantity)
      WHERE dish."id" = requested.id::varchar
        AND dish."restaurant_id" = ${order.restaurantId}
    `);
  }
  return order;
}
