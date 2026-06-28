import { NextRequest }                from "next/server";
import { z }                          from "zod";
import { requireRestaurateurSession } from "@/lib/api/auth-mobile";
import { apiResponse }                from "@/lib/api/response";
import { validateBody }               from "@/lib/api/validate";
import { checkRateLimit, mobileApiLimiter } from "@/lib/rate-limit";
import { getCommandeById }            from "@/lib/db/queries";
import { updateStatutCommande }       from "@/lib/db/mutations";
import { createLogger }               from "@/lib/logger";

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
    const commande = await getCommandeById(id, session.restaurantId);
    if (!commande) return apiResponse.notFound("Commande");

    const updated = await updateStatutCommande(
      id,
      session.restaurantId,
      data.statut
    );

    log.info(
      { commandeId: id, statut: data.statut },
      "Statut commande mis à jour via mobile"
    );

    return apiResponse.success(updated);
  } catch (err) {
    log.error({ err, id }, "Erreur mise à jour statut");
    return apiResponse.internalError();
  }
}