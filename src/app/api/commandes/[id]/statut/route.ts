import { getClientIp } from "@/shared/http/client-ip";
import { getCurrentUser } from "@/modules/auth/server";
import { commissionLedgerHttpStatus } from "@/modules/commissions/server";
import {
  getRestaurantOrder,
  transitionRestaurantOrder,
} from "@/modules/orders/server";
import { getRestaurantByOwnerUserId } from "@/modules/restaurants/server";
import { commandeLogger } from "@/infrastructure/loggers";
import { restaurantOrderStatusUpdateSchema } from "@/modules/orders/contracts";
import { canRestaurantSetOrderStatus } from "@/modules/orders/model";
import { NextRequest, NextResponse } from "next/server";
import {
  cancelRestaurantDeliveryOrder,
  DeliveryDomainError,
} from "@/modules/deliveries/server";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const ip = getClientIp(request);
  const { id: commandeId } = await context.params;

  try {
    const session = await getCurrentUser();
    if (!session || session.role !== "partner") {
      commandeLogger.warn(
        { ip, reason: "unauthorized access attempt" },
        "Unauthorized status update attempt",
      );
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      commandeLogger.warn(
        { ip, reason: "invalid json body" },
        "Commande status update request with invalid JSON",
      );
      return NextResponse.json(
        { error: "Corps de requête invalide — JSON attendu." },
        { status: 400 },
      );
    }

    const validation = restaurantOrderStatusUpdateSchema.safeParse(body);
    if (!validation.success) {
      commandeLogger.warn(
        {
          ip,
          reason: "invalid status format",
          errors: validation.error.flatten().fieldErrors,
        },
        "Invalid status update format",
      );
      return NextResponse.json(
        {
          error: "Données invalides",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    commandeLogger.info(
      { ip, commandeId, statut: validation.data.statut },
      "Status update attempt",
    );

    const restaurant = await getRestaurantByOwnerUserId(session.userId);
    if (!restaurant) {
      commandeLogger.warn(
        { ip, userId: session.userId, reason: "restaurant not found" },
        "Status update failed",
      );
      return NextResponse.json(
        { error: "Restaurant introuvable" },
        { status: 404 },
      );
    }

    const existingCommande = await getRestaurantOrder(
      commandeId,
      restaurant.id,
    );

    if (!existingCommande) {
      commandeLogger.warn(
        { ip, commandeId, reason: "commande not found" },
        "Status update failed",
      );
      return NextResponse.json(
        { error: "Commande introuvable." },
        { status: 404 },
      );
    }

    if (!canRestaurantSetOrderStatus(
      existingCommande.modeCommande,
      validation.data.statut,
    )) {
      return NextResponse.json(
        {
          error:
            "Une livraison est clôturée après confirmation de remise ou de livraison, pas depuis cette action.",
        },
        { status: 422 },
      );
    }

    // Chemin métier unique : la mutation applique une transition atomique,
    // les horodatages, l'invalidation du cache et les événements temps réel.
    const updatedCommande =
      existingCommande.modeCommande === "livraison" &&
      validation.data.statut === "annulee"
        ? await cancelRestaurantDeliveryOrder(
            { userId: session.userId, restaurantId: restaurant.id },
            commandeId,
          )
        : await transitionRestaurantOrder(
            {
              type: "restaurant",
              id: session.userId,
              restaurantId: restaurant.id,
            },
            { orderId: commandeId, targetStatus: validation.data.statut },
          );

    if (!updatedCommande) {
      return NextResponse.json(
        {
          error:
            "Cette commande a déjà été mise à jour. Actualisez la liste avant de réessayer.",
        },
        { status: 409 },
      );
    }

    // 🔗 pg_notify supprimé (mort — Redis via sendNotification/pushSseEvent gère déjà cet événement)
    // const pgClient = await pool.connect();
    // try {
    //   await pgClient.query("SELECT pg_notify($1, $2)", [
    //     "nouvelle_commande",
    //     JSON.stringify({ restaurantId: restaurant.id, commandeId }),
    //   ]);
    // } catch (notifyError) {
    //   commandeLogger.error(
    //     {
    //       ip,
    //       commandeId,
    //       error:
    //         notifyError instanceof Error
    //           ? notifyError.message
    //           : "Unknown error",
    //     },
    //     "pg_notify error during status update",
    //   );
    // } finally {
    //   pgClient.release();
    // }

    commandeLogger.info(
      { ip, commandeId: updatedCommande.id, statut: updatedCommande.statut },
      "Status updated successfully",
    );
    return NextResponse.json({ commande: updatedCommande }, { status: 200 });
  } catch (error) {
    if (error instanceof DeliveryDomainError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 409 },
      );
    }
    // Invariants métier du registre de commissions → erreur explicite, jamais 500.
    const commissionError = commissionLedgerHttpStatus(error);
    if (commissionError) {
      commandeLogger.warn(
        { ip, commandeId, code: commissionError.code },
        "Clôture refusée par le registre de commissions",
      );
      return NextResponse.json(
        { error: commissionError.message, code: commissionError.code },
        { status: commissionError.status },
      );
    }
    commandeLogger.error(
      {
        ip,
        error: error instanceof Error ? error.message : "Unknown error",
        stack:
          process.env.NODE_ENV === "development" && error instanceof Error
            ? error.stack
            : undefined,
      },
      "Commande status update failed",
    );
    return NextResponse.json(
      { error: "Une erreur interne est survenue." },
      { status: 500 },
    );
  }
}
