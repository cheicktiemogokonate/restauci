import { getClientIp } from "@/shared/http/client-ip";
import { apiResponse } from "@/app/api/_shared/response";
import { validateSearchParams } from "@/app/api/_shared/validate";
import { geocoder } from "@/infrastructure/geocoding";
import { createLogger } from "@/infrastructure/logger";
import { checkRateLimit, geoSearchLimiter } from "@/infrastructure/rate-limit";
import { NextRequest } from "next/server";
import { z } from "zod";

const log = createLogger("v1-client-geo-geocode");

const querySchema = z.object({
  q: z.string().min(3, "Adresse trop courte").max(200),
});

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await checkRateLimit(geoSearchLimiter, ip);
  if (rl) return rl;

  const { searchParams } = new URL(req.url);
  const { data, error } = validateSearchParams(searchParams, querySchema);
  if (error) return error;

  try {
    const resultat = await geocoder(data.q);

    if (!resultat) {
      return apiResponse.error(
        "Adresse introuvable. Essayez d'être plus précis.",
        "NOT_FOUND",
        { status: 404 },
      );
    }

    return apiResponse.success(resultat);
  } catch (err) {
    log.error({ err, query: data.q }, "Erreur géocodage");
    return apiResponse.internalError();
  }
}
