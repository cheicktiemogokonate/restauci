import { hasValidCronAuthorization } from "@/infrastructure/auth/cron-auth";
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
  try {
    const result = await cleanupAbandonedPublicMediaAssets({ limit: 200 });
    return Response.json({ success: true, ...result });
  } catch (error) {
    console.error("[CRON MEDIA CLEANUP]", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
