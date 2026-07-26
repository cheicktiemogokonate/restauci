import { getClientSession } from "@/lib/api/auth-client";
import { apiResponse } from "@/lib/api/response";
import { db } from "@/lib/db";
import { commandes, livraisons, restaurants } from "@/lib/db/schema";
import { createLogger } from "@/lib/logger";
import { checkRateLimit, clientApiLimiter } from "@/lib/rate-limit";
import { and, eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { after } from "next/server";
import { pushSseEvent } from "@/lib/realtime/sse-push";

const log = createLogger("v1-client-commande-detail");

const STATUT_LABELS_CLIENT: Record<string, string> = {
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
    const timelineEtapes: readonly string[] =
      commande.modeCommande === "livraison"
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
    const [commande] = await db
      .update(commandes)
      .set({ statut: "annulee", updatedAt: new Date() })
      .where(
        and(
          eq(commandes.id, id),
          eq(commandes.clientId, (await session).clientId),
          eq(commandes.statut, "recue"),
        ),
      )
      .returning({
        id: commandes.id,
        numero: commandes.numero,
        restaurantId: commandes.restaurantId,
      });

    if (!commande) {
      return apiResponse.error(
        "Cette commande ne peut plus être annulée. Contactez le restaurant.",
        "CONFLICT",
        { status: 409 },
      );
    }

    after(async () => {
      await pushSseEvent(commande.restaurantId, "statut", {
        statut: "annulee",
        commandeId: commande.id,
        lienId: commande.id,
        numero: commande.numero,
        timestamp: new Date().toISOString(),
      }).catch((err) =>
        log.error({ err, commandeId: commande.id }, "Notification annulation échouée"),
      );
    });

    return apiResponse.success({
      id: commande.id,
      statut: "annulee",
    });
  } catch (err) {
    log.error(
      { err, clientId: (await session).clientId, commandeId: id },
      "Erreur annulation commande client",
    );
    return apiResponse.internalError();
  }
}
