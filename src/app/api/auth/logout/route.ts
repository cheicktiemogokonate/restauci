import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  clearAuthCookie,
  verifyWebSessionToken,
} from "@/modules/auth/server";
import { blacklistToken } from "@/infrastructure/auth/revocation";
import { getClientIp } from "@/shared/http/client-ip";
import { authLogger } from "@/infrastructure/loggers";
import { cookies } from "next/headers";

// ============================================================================
// HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
    if (token) {
      const payload = await verifyWebSessionToken(token);
      if (payload) await blacklistToken(token, payload.exp);
    }
    await clearAuthCookie();

    authLogger.info({ ip: getClientIp(request) }, "Logout successful");
    if (request.headers.get("accept")?.includes("text/html")) {
      return NextResponse.redirect(new URL("/login", request.url), 303);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    await clearAuthCookie();
    authLogger.error(
      { 
        error: error instanceof Error ? error.message : "Unknown error", 
        stack: process.env.NODE_ENV === "development" && error instanceof Error ? error.stack : undefined 
      }, 
      "Logout error"
    );
    return NextResponse.json(
      { error: "Déconnexion sécurisée temporairement indisponible" },
      { status: 503 },
    );
  }
}
