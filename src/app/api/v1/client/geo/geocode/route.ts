import { apiResponse } from "@/lib/api/response";
import { validateSearchParams } from "@/lib/api/validate";
import { geocoder } from "@/lib/geo";
import { createLogger } from "@/lib/logger";
import { checkRateLimit, geoSearchLimiter } from "@/lib/rate-limit";
import { NextRequest } from "next/server";
import { z } from "zod";

const log = createLogger("v1-client-geo-geocode");

const querySchema = z.object({
  q: z.string().min(3, "Adresse trop courte").max(200),
});

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "anonymous";
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
