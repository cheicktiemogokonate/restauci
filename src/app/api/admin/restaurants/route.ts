import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api/auth-admin";
import { apiLogger } from "@/lib/loggers";
import { getRestaurantsAdmin } from "@/lib/db/queries-admin";

export async function GET(request: NextRequest) {
  const { error } = await requireAdminSession(request);
  if (error) return error;

  try {
    const { searchParams } = request.nextUrl;
    const rawPage = Number.parseInt(searchParams.get("page") ?? "1", 10);
    const rawLimit = Number.parseInt(searchParams.get("limit") ?? "20", 10);
    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0
        ? Math.min(rawLimit, 100)
        : 20;
    const rawStatus = searchParams.get("statut") ?? "tous";
    const validStatuses = new Set([
      "en_attente",
      "actif",
      "suspendu",
      "rejete",
      "tous",
    ]);
    const statut = validStatuses.has(rawStatus)
      ? (rawStatus as
          | "en_attente"
          | "actif"
          | "suspendu"
          | "rejete"
          | "tous")
      : "tous";

    const result = await getRestaurantsAdmin({
      statut,
      search: searchParams.get("search") ?? undefined,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error) {
    apiLogger.error(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        stack:
          process.env.NODE_ENV === "development" && error instanceof Error
            ? error.stack
            : undefined,
      },
      "[GET /api/admin/restaurants] error",
    );
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 },
    );
  }
}
