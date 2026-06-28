import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookie } from "@/lib/auth";
import { authLogger } from "@/lib/loggers";

// ============================================================================
// HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    await clearAuthCookie();

    authLogger.info({ ip: request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown" }, "Logout successful");
    return NextResponse.json(
      { success: true },
      { status: 200 }
    );
  } catch (error) {
    authLogger.error(
      { 
        error: error instanceof Error ? error.message : "Unknown error", 
        stack: process.env.NODE_ENV === "development" && error instanceof Error ? error.stack : undefined 
      }, 
      "Logout error"
    );
    return NextResponse.json(
      { error: "Une erreur interne est survenue" },
      { status: 500 }
    );
  }
}
