import { NextRequest, NextResponse } from "next/server";
import { env } from "@/infrastructure/env";
import { hasValidCronAuthorization } from "@/infrastructure/auth/cron-auth";
import { checkDependencyHealth } from "@/infrastructure/health";

export async function GET(request: NextRequest) {
  const canReadDependencies =
    Boolean(env.CRON_SECRET) &&
    hasValidCronAuthorization(
      request.headers.get("authorization"),
      env.CRON_SECRET ?? "",
    );

  if (!canReadDependencies) {
    return NextResponse.json(
      { status: "ok" },
      {
        status: 200,
        headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=30" },
      },
    );
  }

  // Pas d'information de version/commit ici : ce endpoint est public,
  // exposer le SHA faciliterait le ciblage d'une vulnérabilité de version.
  const status = await checkDependencyHealth();

  const httpStatus =
    status.status === "healthy"
      ? 200
      : status.status === "degraded"
        ? 200
        : 503;

  return NextResponse.json(status, {
    status: httpStatus,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
