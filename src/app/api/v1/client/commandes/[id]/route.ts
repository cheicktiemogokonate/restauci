import { getClientSession } from "@/lib/api/auth-client";
import { apiResponse } from "@/lib/api/response";
import { db } from "@/lib/db";
import { commandes, financialTransactions, livraisons, payments, restaurants } from "@/lib/db/schema";
import { transitionRestaurantOrder } from "@/lib/db/commandes-mutations";
import { createLogger } from "@/lib/logger";
import { checkRateLimit, clientApiLimiter } from "@/lib/rate-limit";
import { and, desc, eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { FinancialTransactionError } from "@/modules/transactions/model";

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
    const [commande] = await db
      .select({
        id: commandes.id,
        numero: commandes.numero,
        statut: commandes.statut,
        modeCommande: commandes.modeCommande,
        items: commandes.items,
        sousTotal: commandes.sousTotal,
        fraisLivraison: commandes.fraisLivraison,
        total: commandes.total,
        noteClient: commandes.noteClient,
        adresseLivraison: commandes.adresseLivraison,
        numeroTable: commandes.numeroTable,
        createdAt: commandes.createdAt,
        heureAcceptee: commandes.heureAcceptee,
        heurePrete: commandes.heurePrete,
        heureServie: commandes.heureServie,
        restaurantId: commandes.restaurantId,
        clientId: commandes.clientId,
      })
      .from(commandes)
      .where(
        and(
          eq(commandes.id, routeParams.id),
          eq(commandes.clientId, (await session).clientId), // Sécurité : le client ne voit que SES commandes
        ),
      )
      .limit(1);

    if (!commande) return apiResponse.notFound("Commande");

    // Récupérer le nom du restaurant
    const [restaurant] = await db
      .select({ nom: restaurants.nom, logoUrl: restaurants.logoUrl })
      .from(restaurants)
      .where(eq(restaurants.id, commande.restaurantId))
      .limit(1);

    const livraison =
      commande.modeCommande === "livraison"
        ? await db.query.livraisons.findFirst({
            where: eq(livraisons.commandeId, commande.id),
            columns: {
              statut: true,
              heureDepart: true,
              heureLivree: true,
            },
          })
        : null;
    const [providerPayment] = await db.select({
      provider: payments.provider,
      method: payments.method,
      status: payments.status,
      checkoutUrl: payments.checkoutUrl,
    }).from(payments)
      .innerJoin(financialTransactions, eq(financialTransactions.id, payments.transactionId))
      .where(and(
        eq(financialTransactions.restaurantOrderId, commande.id),
        eq(payments.provider, "paystack"),
      ))
      .orderBy(desc(payments.createdAt))
      .limit(1);
    const timelineEtapes: readonly string[] =
      commande.statut === "en_attente_paiement"
        ? (["en_attente_paiement"] as const)
        : commande.modeCommande === "livraison"
        ? (["recue", "en_preparation", "prete", "en_route", "servie"] as const)
        : STATUT_ETAPES;
    const effectiveStatus =
      commande.statut === "servie"
        ? "servie"
        : livraison?.statut === "en_route"
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
        en_route: livraison?.heureDepart ?? null,
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
      ...commande,
      restaurant: restaurant ?? null,
      statutLabel:
        effectiveStatus === "en_route"
          ? "En livraison"
          : STATUT_LABELS_CLIENT[commande.statut] ?? commande.statut,
      livraisonStatut: livraison?.statut ?? null,
      estAnnulee: commande.statut === "annulee",
      timeline: commande.statut === "annulee" ? [] : etapes,
      payment: providerPayment ?? null,
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
    const commande = await transitionRestaurantOrder({
      id,
      clientId: (await session).clientId,
      targetStatus: "annulee",
      allowedPreviousStatuses: ["en_attente_paiement", "recue"],
    });

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
