import { getClientIp } from "@/shared/http/client-ip";
import {
  AUTH_COOKIE_NAME,
  AUTH_TOKEN_AUDIENCE,
  AUTH_TOKEN_ISSUER,
} from "@/infrastructure/auth/tokens";
import { env } from "@/infrastructure/env";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";

const JWT_SECRET = new TextEncoder().encode(env.JWT_SECRET);

// Routes publiques (pas d'authentification requise)
const ROUTES_PUBLIQUES = [
  "/",
  "/login",
  "/register",
  "/restaurant/*",
  "/residences",
  "/residences/*",
  "/client/*",
  "/livreur",
  "/livreur/*",
  // L'espace consommateur utilise sa propre authentification Bearer.
  // Ces pages doivent donc pouvoir charger avant que le garde client-side
  // vérifie le jeton stocké par l'application.
  "/panier",
  "/panier/*",
  "/commandes",
  "/commandes/*",
  "/reservations",
  "/reservations/*",
  "/profil",
  "/conditions-generales",
  "/confidentialite",
  "/cookies",
  "/mentions-legales",
  "/robots.txt",
  "/sitemap.xml",
];
const API_PUBLIQUES = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/v1/",
  "/api/health",
  "/api/webhooks/paystack",
  "/api/payments/paystack/callback",
  // Vercel Cron n'envoie qu'un Authorization Bearer (pas de cookie JWT).
  // Ces routes sont protégées en propre par CRON_SECRET (timing-safe) :
  // https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs
  "/api/cron",
];

// Configuration du rate limiter global (Redis via Upstash)
const globalRedis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
});

const globalLimiter = new Ratelimit({
  redis: globalRedis,
  limiter: Ratelimit.slidingWindow(200, "1 m"),
  prefix: "restauci:rl:global",
});

const IS_PRODUCTION = env.NODE_ENV === "production";
const LOCAL_RATE_WINDOW_MS = 60_000;
const LOCAL_RATE_LIMIT = 200;
const MAX_LOCAL_RATE_KEYS = 10_000;
const localRateBuckets = new Map<string, { count: number; resetAt: number }>();

function passesLocalRateLimit(identifier: string): boolean {
  const now = Date.now();
  const current = localRateBuckets.get(identifier);

  if (!current || current.resetAt <= now) {
    if (localRateBuckets.size >= MAX_LOCAL_RATE_KEYS) {
      for (const [key, bucket] of localRateBuckets) {
        if (bucket.resetAt <= now) localRateBuckets.delete(key);
      }
      if (localRateBuckets.size >= MAX_LOCAL_RATE_KEYS) {
        localRateBuckets.delete(localRateBuckets.keys().next().value ?? "");
      }
    }
    localRateBuckets.set(identifier, {
      count: 1,
      resetAt: now + LOCAL_RATE_WINDOW_MS,
    });
    return true;
  }

  current.count += 1;
  return current.count <= LOCAL_RATE_LIMIT;
}

function isTrustedMutation(req: NextRequest): boolean {
  if (!new Set(["POST", "PUT", "PATCH", "DELETE"]).has(req.method)) {
    return true;
  }

  const { pathname } = req.nextUrl;
  if (
    pathname.startsWith("/api/v1/") ||
    pathname.startsWith("/api/webhooks/") ||
    pathname.startsWith("/api/cron/")
  ) {
    return true;
  }

  if (req.headers.get("sec-fetch-site") === "cross-site") return false;

  const origin = req.headers.get("origin");
  if (!origin) return true;

  const trustedOrigins = new Set([req.nextUrl.origin]);
  try {
    trustedOrigins.add(new URL(env.NEXT_PUBLIC_APP_URL).origin);
  } catch {
    // NEXT_PUBLIC_APP_URL est déjà validée au démarrage.
  }

  return trustedOrigins.has(origin);
}

/**
 * CSP stricte à nonce (production uniquement).
 * Le nonce est généré par requête : seuls les <script> marqués par Next.js
 * avec ce nonce (framework + JSON-LD des pages publiques) s'exécutent.
 * 'strict-dynamic' autorise les chargements légitimes initiés par ces
 * scripts de confiance. Le développement reste sur la CSP statique de
 * next.config.ts ('unsafe-eval' nécessaire au HMR/React DevTools).
 */
function buildCspHeader(nonce: string): string {
  const vercelAnalyticsSource = process.env.VERCEL
    ? " https://va.vercel-scripts.com"
    : "";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${vercelAnalyticsSource}`,
    // 'unsafe-inline' requis : framer-motion/gsap injectent des <style> à l'exécution
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' https://fonts.gstatic.com",
    "worker-src 'self' blob:", // worker MapLibre GL
    "connect-src 'self' https://basemaps.cartocdn.com https://*.basemaps.cartocdn.com https://router.project-osrm.org https://nominatim.openstreetmap.org",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

/** Réponse « next » pour les pages HTML : CSP à nonce en production. */
function nextPageResponse(req: NextRequest): NextResponse {
  if (!IS_PRODUCTION) return NextResponse.next();

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCspHeader(nonce);

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("Content-Security-Policy", csp);
  return res;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Les consommateurs Vercel Queues sont privés et le callback du SDK valide
  // lui-même l'enveloppe signée. Éviter ici le cookie et Redis, qui ne font pas
  // partie du protocole d'invocation interne de la file.
  if (pathname.startsWith("/api/queues/")) {
    return NextResponse.next();
  }

  // --- Rate limiting global sur les routes API ---
  if (pathname.startsWith("/api/")) {
    const ip = getClientIp(req);

    try {
      const { success } = await globalLimiter.limit(ip);
      if (!success) {
        return new NextResponse(JSON.stringify({ error: "Trop de requetes" }), {
          status: 429,
          headers: { "Content-Type": "application/json" },
        });
      }
    } catch (error) {
      console.warn("[proxy] Global rate limiter error:", error);
      if (!passesLocalRateLimit(ip)) {
        return NextResponse.json(
          { error: "Trop de requetes" },
          { status: 429, headers: { "Retry-After": "60" } },
        );
      }
    }

    if (!isTrustedMutation(req)) {
      return NextResponse.json(
        { error: "Origine de la requête non autorisée" },
        { status: 403 },
      );
    }
  }

  // --- Exclure les routes API v1 de l'authentification cookie (elles utilisent Bearer token) ---
  if (pathname.startsWith("/api/v1/")) {
    return NextResponse.next();
  }

  // --- Ne pas bloquer les ressources statiques ---
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    /\.(png|jpg|svg|ico|css|m?js|webp|woff2?)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  // --- Routes publiques (pas d'auth) ---
  if (API_PUBLIQUES.some((r) => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  if (ROUTES_PUBLIQUES.some((r) => {
    if (r.endsWith("/*")) {
      return pathname.startsWith(r.slice(0, -2));
    }
    return pathname === r;
  })) {
    return nextPageResponse(req);
  }

  // --- Verification du token JWT ---
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: AUTH_TOKEN_ISSUER,
      audience: AUTH_TOKEN_AUDIENCE.web,
      typ: "JWT",
      requiredClaims: ["iat", "exp", "jti"],
    });
    const now = Math.floor(Date.now() / 1000);
    const exp = typeof payload.exp === "number" ? payload.exp : 0;

    if (exp < now) {
      const res = pathname.startsWith("/api/")
        ? NextResponse.json({ error: "Session expiree" }, { status: 401 })
        : NextResponse.redirect(new URL("/login", req.url));
      res.cookies.delete(AUTH_COOKIE_NAME);
      return res;
    }

    const issuedAtMs = payload.issuedAtMs;
    if (
      payload.type !== "web-session" ||
      typeof payload.userId !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.jti !== "string" ||
      typeof payload.iat !== "number" ||
      typeof issuedAtMs !== "number" ||
      !Number.isSafeInteger(issuedAtMs)
    ) {
      throw new Error("Invalid token type");
    }

    const tokenDigest = Array.from(
      new Uint8Array(
        await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)),
      ),
    )
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    if (await globalRedis.get(`toutci:blacklist:${tokenDigest}`)) {
      throw new Error("Revoked token");
    }
    const ownerCutoff = await globalRedis.get<string>(
      `toutci:revoked-owner:user:${payload.userId}`,
    );
    if (
      ownerCutoff &&
      Number.isFinite(Number(ownerCutoff)) &&
      issuedAtMs <= Number(ownerCutoff)
    ) {
      throw new Error("Revoked account sessions");
    }

    const role = typeof payload.role === "string" ? payload.role : "";

    if (pathname.startsWith("/admin") && role !== "admin") {
      return NextResponse.redirect(new URL("/partenaire", req.url));
    }

    if (
      pathname.startsWith("/api/admin/identity/documents/") ||
      pathname.startsWith("/api/partner/identity/documents/")
    ) {
      // La ressource binaire porte sa propre CSP sandbox et doit pouvoir être
      // intégrée par une page Toutci de même origine.
      return NextResponse.next();
    }

    return nextPageResponse(req);
  } catch {
    if (pathname.startsWith("/api/")) {
      const res = NextResponse.json({ error: "Non autorise" }, { status: 401 });
      res.cookies.delete(AUTH_COOKIE_NAME);
      return res;
    }
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.delete(AUTH_COOKIE_NAME);
    return res;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
