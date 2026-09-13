import { NextResponse } from "next/server";
import { buildOpenApiV1Spec } from "@/app/api/_shared/openapi-v1";
import { env } from "@/infrastructure/env";

export async function GET() {
  return NextResponse.json(buildOpenApiV1Spec(env.NEXT_PUBLIC_APP_URL), {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
