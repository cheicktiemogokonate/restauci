import { createLogger } from "@/lib/logger";
import { checkRateLimit, geoSearchLimiter } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";

const log = createLogger("api-geo");

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "anonymous";

  const rateLimitResponse = await checkRateLimit(geoSearchLimiter, ip);
  if (rateLimitResponse) return rateLimitResponse;

  const { searchParams } = new URL(req.url);

  const type = searchParams.get("type");

  if (type === "route") {
    const fromLat = Number.parseFloat(searchParams.get("fromLat") ?? "");
    const fromLng = Number.parseFloat(searchParams.get("fromLng") ?? "");
    const toLat = Number.parseFloat(searchParams.get("toLat") ?? "");
    const toLng = Number.parseFloat(searchParams.get("toLng") ?? "");

    if (
      Number.isNaN(fromLat) ||
      Number.isNaN(fromLng) ||
      Number.isNaN(toLat) ||
      Number.isNaN(toLng)
    ) {
      return NextResponse.json(
        { error: "Coordonnées invalides" },
        { status: 400 }
      );
    }

    try {
      const { calculerItineraire } = await import("@/lib/geo");

      const resultat = await calculerItineraire(
        { lat: fromLat, lng: fromLng },
        { lat: toLat, lng: toLng }
      );

      if (!resultat) {
        return NextResponse.json(
          { error: "Itinéraire introuvable" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        distanceKm: resultat.distanceKm,
        dureeMinutes: resultat.dureeMinutes,
        geometrie: resultat.geometrie,
      });
    } catch (err) {
      log.error({ err, fromLat, fromLng, toLat, toLng }, "OSRM error");
      return NextResponse.json(
        { error: "Erreur lors du calcul de l'itinéraire" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ error: "Type invalide" }, { status: 400 });
}
