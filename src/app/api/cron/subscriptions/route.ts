import { NextResponse } from "next/server";
import { hasValidCronAuthorization } from "@/infrastructure/auth/cron-auth";
import { expireDueSubscriptions } from "@/modules/subscriptions/server";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || cronSecret.length < 32) {
    console.error("[CRON SUBSCRIPTIONS] CRON_SECRET manquant ou trop court");
    return new NextResponse("Cron unavailable", { status: 503 });
  }

  if (!hasValidCronAuthorization(request.headers.get("authorization"), cronSecret)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const result = await expireDueSubscriptions();
    return NextResponse.json({ success: true, ...result });

  } catch (error: unknown) {
    console.error("[CRON SUBSCRIPTIONS]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
