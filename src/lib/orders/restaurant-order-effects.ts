import { after } from "next/server";
import { invalidateRestaurantCache } from "@/lib/cache";
import {
  sendClientNotification,
  sendNotification,
} from "@/lib/notifications";
import { buildNouvelleCommandePayload } from "@/lib/realtime/sse-payloads";
import { formatPrix } from "@/lib/utils/format";
import type { CreateRestaurantOrderResult } from "./restaurant-order";
import { db } from "@/lib/db";
import { commandes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export function scheduleRestaurantOrderCreatedEffects(
  result: CreateRestaurantOrderResult,
) {
  if (!result.created || !result.effectContext) return;

  after(async () => {
    const effects = await Promise.allSettled([
      sendNotification({
        userId: result.effectContext!.notificationUserId,
        restaurantId: result.commande.restaurantId,
        type: "nouvelle_commande",
        titre: "Nouvelle commande !",
        message: `Commande ${result.commande.numero} de ${result.effectContext!.clientName} — ${formatPrix(result.commande.total)}`,
        lienType: "commande",
        lienId: result.commande.id,
        data: buildNouvelleCommandePayload(result.commande),
      }),
      result.commande.clientId
        ? sendClientNotification({
            clientId: result.commande.clientId,
            type: "systeme",
            titre: "Commande enregistrée",
            message: `Votre commande #${result.commande.numero} a bien été transmise au restaurant.`,
            lienType: "commande",
            lienId: result.commande.id,
            data: {
              statut: result.commande.statut,
              numero: result.commande.numero,
              total: result.commande.total,
            },
          })
        : Promise.resolve(),
      invalidateRestaurantCache(result.commande.restaurantId),
    ]);
    for (const effect of effects) {
      if (effect.status === "rejected") {
        console.error(
          "[createRestaurantOrder] Effet secondaire en échec:",
          effect.reason instanceof Error ? effect.reason.message : "Erreur inconnue",
        );
      }
    }
  });
}

export async function schedulePaidRestaurantOrderEffects(orderId: string) {
  const order = await db.query.commandes.findFirst({
    where: eq(commandes.id, orderId),
    with: { restaurant: { with: { partnerAccount: true } } },
  });
  if (!order || order.statut !== "recue") return;
  scheduleRestaurantOrderCreatedEffects({
    commande: order,
    created: true,
    effectContext: {
      notificationUserId: order.restaurant.partnerAccount.userId,
      clientName: order.nomClient,
    },
  });
}
