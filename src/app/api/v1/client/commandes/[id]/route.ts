import { getClientSession } from "@/app/api/_shared/auth-client";
import { apiResponse } from "@/app/api/_shared/response";
import {
  getClientOrder,
  transitionRestaurantOrder,
} from "@/modules/orders/server";
import { createLogger } from "@/infrastructure/logger";
import { checkRateLimit, clientApiLimiter } from "@/infrastructure/rate-limit";
import { NextRequest } from "next/server";
import { FinancialTransactionError } from "@/modules/transactions/model";
import { getClientDelivery } from "@/modules/deliveries/server";

const log = createLogger("v1-client-commande-detail");

const STATUT_LABELS_CLIENT: Record<string, string> = {
  en_attente_paiement: "En attente de paiement",
  recue: "Commande reçue",
  en_preparation: "En préparation",
  prete: "Prête pour la livraison",
  servie: "Livrée",
  annulee: "Annulée",
};

const STATUT_ETAPES = ["recue", "en_preparation", "prete", "servie"] as const;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { session, error } = await getClientSession(request);
  if (error) return error;

  const rl = await checkRateLimit(clientApiLimiter, (await session).clientId);
  if (rl) return rl;

  const routeParams = await params;

  try {
    const clientId = (await session).clientId;
    const commande = await getClientOrder(routeParams.id, clientId);

    if (!commande) return apiResponse.notFound("Commande");

    const livraison =
      commande.modeCommande === "livraison"
        ? await getClientDelivery(clientId, commande.id)
        : null;
    const providerPayment = commande.financialTransaction?.payments
      .filter((payment) => payment.provider === "paystack")
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0];
    const timelineEtapes: readonly string[] =
      commande.statut === "en_attente_paiement"
        ? (["en_attente_paiement"] as const)
        : commande.modeCommande === "livraison"
        ? (["recue", "en_preparation", "prete", "en_route", "servie"] as const)
        : STATUT_ETAPES;
    const effectiveStatus =
      commande.statut === "servie"
        ? "servie"
        : livraison?.status === "en_route"
          ? "en_route"
          : commande.statut;

    // Construire la timeline de suivi
    const etapes = timelineEtapes.map((etape) => {
      const estFait =
        timelineEtapes.indexOf(etape) <= timelineEtapes.indexOf(effectiveStatus);

      const timestamps: Record<string, Date | null> = {
        recue: commande.createdAt,
        en_preparation: commande.heureAcceptee,
        prete: commande.heurePrete,
        en_route: livraison?.startedAt ? new Date(livraison.startedAt) : null,
        servie: commande.heureServie,
      };

      return {
        etape,
        label: STATUT_LABELS_CLIENT[etape] ?? etape,
        fait: estFait && commande.statut !== "annulee",
        actif: etape === effectiveStatus,
        timestamp: timestamps[etape] ?? null,
      };
    });

    return apiResponse.success({
      id: commande.id,
      numero: commande.numero,
      statut: commande.statut,
      modeCommande: commande.modeCommande,
      items: commande.items,
      sousTotal: commande.sousTotal,
      fraisLivraison: commande.fraisLivraison,
      total: commande.total,
      noteClient: commande.noteClient,
      adresseLivraison: commande.adresseLivraison,
      numeroTable: commande.numeroTable,
      createdAt: commande.createdAt,
      heureAcceptee: commande.heureAcceptee,
      heurePrete: commande.heurePrete,
      heureServie: commande.heureServie,
      restaurantId: commande.restaurantId,
      clientId: commande.clientId,
      restaurant: commande.restaurant,
      statutLabel:
        effectiveStatus === "en_route"
          ? "En livraison"
          : STATUT_LABELS_CLIENT[commande.statut] ?? commande.statut,
      livraisonStatut: livraison?.status ?? null,
      estAnnulee: commande.statut === "annulee",
      timeline: commande.statut === "annulee" ? [] : etapes,
      payment: providerPayment
        ? {
            provider: providerPayment.provider,
            method: providerPayment.method,
            status: providerPayment.status,
            checkoutUrl: providerPayment.checkoutUrl,
          }
        : null,
    });
  } catch (err) {
    log.error(
      { err, clientId: (await session).clientId },
      "Erreur lecture commande client",
    );
    return apiResponse.internalError();
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { session, error } = await getClientSession(request);
  if (error) return error;

  const rl = await checkRateLimit(clientApiLimiter, (await session).clientId);
  if (rl) return rl;
  const { id } = await params;

  try {
    const clientId = (await session).clientId;
    const commande = await transitionRestaurantOrder(
      { type: "client", id: clientId, clientId },
      {
        orderId: id,
        targetStatus: "annulee",
        allowedPreviousStatuses: ["en_attente_paiement", "recue"],
      },
    );

    if (!commande) {
      return apiResponse.error(
        "Cette commande ne peut plus être annulée. Contactez le restaurant.",
        "CONFLICT",
        { status: 409 },
      );
    }

    return apiResponse.success({
      id: commande.id,
      statut: "annulee",
    });
  } catch (err) {
    if (err instanceof FinancialTransactionError && err.code === "TRANSACTION_ALREADY_PAID") {
      return apiResponse.error(err.message, "CONFLICT", { status: 409 });
    }
    log.error(
      { err, clientId: (await session).clientId, commandeId: id },
      "Erreur annulation commande client",
    );
    return apiResponse.internalError();
  }
}
