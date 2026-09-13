import { NextRequest }                from "next/server";
import { z }                          from "zod";
import { requireRestaurateurSession } from "@/app/api/_shared/auth-mobile";
import { apiResponse }                from "@/app/api/_shared/response";
import { validateBody }               from "@/app/api/_shared/validate";
import { checkRateLimit, mobileApiLimiter } from "@/infrastructure/rate-limit";
import { getRestaurantOrder } from "@/modules/orders/server";
import { transitionRestaurantOrder } from "@/modules/orders/server";
import { createLogger }               from "@/infrastructure/logger";
import { commissionLedgerHttpStatus } from "@/modules/commissions/server";
import { canRestaurantSetOrderStatus } from "@/modules/orders/model";
import { deliveryErrorResponse } from "@/app/api/_shared/delivery-response";
import { cancelRestaurantDeliveryOrder } from "@/modules/deliveries/server";

const log = createLogger("v1-restaurateur-commande-stat");

// PATCH /api/v1/restaurateur/commandes/[id]/statut
const patchSchema = z.object({
  statut: z.enum(["en_preparation", "prete", "servie", "annulee"]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { session, error } = await requireRestaurateurSession(request);
  if (error) return error;

  const rl = await checkRateLimit(mobileApiLimiter, session.userId);
  if (rl) return rl;

  const { data, error: vError } = await validateBody(request, patchSchema);
  if (vError) return vError;

  try {
    // Vérifier que la commande appartient au restaurant
    const commande = await getRestaurantOrder(id, session.restaurantId);
    if (!commande) return apiResponse.notFound("Commande");

    if (!canRestaurantSetOrderStatus(commande.modeCommande, data.statut)) {
      return apiResponse.error(
        "Une livraison est clôturée après confirmation de remise ou de livraison.",
        "VALIDATION_ERROR",
        { status: 422 },
      );
    }

    const updated =
      commande.modeCommande === "livraison" && data.statut === "annulee"
        ? await cancelRestaurantDeliveryOrder(session, id)
        : await transitionRestaurantOrder(
            {
              type: "restaurant",
              id: session.userId,
              restaurantId: session.restaurantId,
            },
            { orderId: id, targetStatus: data.statut },
          );

    if (!updated) {
      return apiResponse.error(
        "Cette commande a déjà été mise à jour. Actualisez-la avant de réessayer.",
        "CONFLICT",
        { status: 409 },
      );
    }

    log.info(
      { commandeId: id, statut: data.statut },
      "Statut commande mis à jour via mobile"
    );

    return apiResponse.success(updated);
  } catch (err) {
    const deliveryError = deliveryErrorResponse(err);
    if (deliveryError) return deliveryError;
    // Invariants métier du registre de commissions → erreur explicite, jamais 500.
    const commissionError = commissionLedgerHttpStatus(err);
    if (commissionError) {
      log.warn({ id, code: commissionError.code }, "Clôture refusée par le registre de commissions");
      return apiResponse.error(commissionError.message, commissionError.code, {
        status: commissionError.status,
      });
    }
    log.error({ err, id }, "Erreur mise à jour statut");
    return apiResponse.internalError();
  }
}
