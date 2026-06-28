import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "@/lib/cache/redis";
import { NextResponse } from "next/server";
import { apiLogger } from "@/lib/loggers";

// ============================================================================
// SPECIFIC RATE LIMITERS
// ============================================================================

/** Auth : 10 tentatives de login par IP par 15 minutes */
export const authLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "15 m"),
  analytics: true,
  prefix: "restauci:rl:auth",
});

/** API générale : 100 requêtes par IP par minute */
export const apiLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, "1 m"),
  analytics: true,
  prefix: "restauci:rl:api",
});

/** Upload média : 20 uploads par user par heure */
export const uploadLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "1 h"),
  analytics: true,
  prefix: "restauci:rl:upload",
});

/** Commandes publiques : 30 commandes par IP par heure */
export const commandeLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "1 h"),
  analytics: true,
  prefix: "restauci:rl:commande",
});

// API mobile : 300 requêtes par userId par minute
// (plus généreux que l'API web car les apps font plus de requêtes)
export const mobileApiLimiter = new Ratelimit({
  redis,
  limiter:   Ratelimit.slidingWindow(300, "1 m"),
  analytics: true,
  prefix:    "restauci:rl:mobile-api",
});

// Login mobile : 5 tentatives par IP par 15 minutes
export const mobileAuthLimiter = new Ratelimit({
  redis,
  limiter:   Ratelimit.slidingWindow(5, "15 m"),
  analytics: true,
  prefix:    "restauci:rl:mobile-auth",
});

// Auth client : 5 tentatives par IP par 15 minutes
export const clientAuthLimiter = new Ratelimit({
  redis,
  limiter:   Ratelimit.slidingWindow(5, "15 m"),
  analytics: true,
  prefix:    "restauci:rl:client-auth",
});

// API client générale : 200 requêtes par userId par minute
export const clientApiLimiter = new Ratelimit({
  redis,
  limiter:   Ratelimit.slidingWindow(200, "1 m"),
  analytics: true,
  prefix:    "restauci:rl:client-api",
});

// Passage de commande : 10 commandes par client par heure
export const commandeClientLimiter = new Ratelimit({
  redis,
  limiter:   Ratelimit.slidingWindow(10, "1 h"),
  analytics: true,
  prefix:    "restauci:rl:commande-client",
});

// Recherche géo : 60 recherches par IP par minute
export const geoSearchLimiter = new Ratelimit({
  redis,
  limiter:   Ratelimit.slidingWindow(60, "1 m"),
  analytics: true,
  prefix:    "restauci:rl:geo-search",
});

// ============================================================================
// LEGACY SINGLE LIMITER (pour compatibilité avec les routes existantes)
// ============================================================================

const legacyLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(5, "1 m"),
  analytics: true,
});

const eventNames = {
  login: "auth-login",
  register: "auth-register",
  "commande-create": "commande-create",
} as const;

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Applique le rate limiting dans une route API.
 * Retourne null si la limite n'est pas atteinte.
 * Retourne une Response 429 si la limite est atteinte.
 */
export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string
): Promise<Response | null> {
  const { success, limit, remaining, reset } = await limiter.limit(identifier);

  if (!success) {
    return new Response(
      JSON.stringify({
        error: "Trop de requêtes. Réessayez dans quelques instants.",
        code: "RATE_LIMIT_EXCEEDED",
        retryAfter: Math.ceil((reset - Date.now()) / 1000),
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": String(remaining),
          "X-RateLimit-Reset": String(reset),
          "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)),
        },
      }
    );
  }

  return null;
}

/**
 * Legacy helper pour les routes qui utilisent l'ancien pattern.
 * @deprecated Utilisez checkRateLimit avec un limiter spécifique.
 */
import { NextRequest } from "next/server";
export async function limitRequest(request: NextRequest, key: keyof typeof eventNames) {
  if (!redis) {
    return null;
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const eventName = eventNames[key];

  try {
    const { success, limit, reset } = await legacyLimiter.limit(`${eventName}:${ip}`);
    if (!success) {
      return NextResponse.json(
        {
          error: "Trop de requêtes. Réessayez dans un instant.",
          limit: limit ?? null,
          resetAt: reset !== undefined ? new Date(reset).toISOString() : null,
        },
        { status: 429 }
      );
    }
   } catch (error) {
     apiLogger.warn({ 
       error: error instanceof Error ? error.message : "Unknown error",
       stack: process.env.NODE_ENV === "development" && error instanceof Error ? error.stack : undefined
     }, "Redis unavailable, bypassing rate limiter");
   }

  return null;
}
