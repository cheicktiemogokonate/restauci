import { hasValidCronAuthorization } from "@/infrastructure/auth/cron-auth";
import { runCausalityMaintenance } from "@/modules/events/server";

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
    const result = await runCausalityMaintenance({ limit: 50 });
    return Response.json({ success: true, ...result });
  } catch (error) {
    console.error("[CRON CAUSALITY]", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
