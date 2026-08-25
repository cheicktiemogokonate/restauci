import { apiResponse } from "@/lib/api/response";
import { getPublicResidenceBySlug } from "@/modules/residences/server";

/**
 * Le segment s'appelle `id` pour cohabiter avec availability/quote historiques,
 * mais le contrat public de détail reçoit le slug issu de la recherche.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const residence = await getPublicResidenceBySlug((await params).id);
  return residence
    ? apiResponse.success(residence)
    : apiResponse.notFound("Résidence");
}
