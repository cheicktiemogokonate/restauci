import { getClientSession } from "@/lib/api/auth-client";
import { apiResponse } from "@/lib/api/response";
import { db } from "@/lib/db";
import { commandes, restaurants } from "@/lib/db/schema";
import { createLogger } from "@/lib/logger";
import { checkRateLimit, clientApiLimiter } from "@/lib/rate-limit";
import { and, eq } from "drizzle-orm";
import { NextRequest } from "next/server";

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

    // Construire la timeline de suivi
    const etapes = STATUT_ETAPES.map((etape) => {
      const estFait =
        STATUT_ETAPES.indexOf(etape) <=
        STATUT_ETAPES.indexOf(
          commande.statut as (typeof STATUT_ETAPES)[number],
        );

      const timestamps: Record<string, Date | null> = {
        recue: commande.createdAt,
        en_preparation: commande.heureAcceptee,
        prete: commande.heurePrete,
        servie: commande.heureServie,
      };

      return {
        etape,
        label: STATUT_LABELS_CLIENT[etape] ?? etape,
        fait: estFait && commande.statut !== "annulee",
        actif: etape === commande.statut,
        timestamp: timestamps[etape] ?? null,
      };
    });

    return apiResponse.success({
      ...commande,
      restaurant: restaurant ?? null,
      statutLabel: STATUT_LABELS_CLIENT[commande.statut] ?? commande.statut,
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
