import { hasValidCronAuthorization } from "@/infrastructure/auth/cron-auth";
import { runCausalityMaintenance } from "@/modules/events/server";
import { cleanupAbandonedPublicMediaAssets } from "@/modules/media/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || cronSecret.length < 32) {
    return new Response("Cron unavailable", { status: 503 });
  }
  if (
    !hasValidCronAuthorization(
      request.headers.get("authorization"),
      cronSecret,
    )
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  const [causality, media] = await Promise.allSettled([
    runCausalityMaintenance({ limit: 100 }),
    cleanupAbandonedPublicMediaAssets({ limit: 500 }),
  ]);

  if (causality.status === "rejected") {
    console.error("[CRON DAILY MAINTENANCE] causality", causality.reason);
  }
  if (media.status === "rejected") {
    console.error("[CRON DAILY MAINTENANCE] media", media.reason);
  }

  const success =
    causality.status === "fulfilled" && media.status === "fulfilled";

  return Response.json(
    {
      success,
      causality:
        causality.status === "fulfilled"
          ? { success: true, ...causality.value }
          : { success: false },
      media:
        media.status === "fulfilled"
          ? { success: true, ...media.value }
          : { success: false },
    },
    { status: success ? 200 : 500 },
  );
}
