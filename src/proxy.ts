import { env } from "@/lib/env";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";

const JWT_SECRET = new TextEncoder().encode(env.JWT_SECRET);

// Routes publiques (pas d'authentification requise)
const ROUTES_PUBLIQUES = ["/", "/login", "/register", "/restaurant/*", "/client/*"];
const API_PUBLIQUES = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/v1/",
  "/api/health",
];

// Configuration du rate limiter global (Redis via Upstash)
const globalLimiter = new Ratelimit({
  redis: new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  }),
  limiter: Ratelimit.slidingWindow(200, "1 m"),
  prefix: "restauci:rl:global",
});

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // --- Rate limiting global sur les routes API ---
  if (pathname.startsWith("/api/")) {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0] ??
      req.headers.get("x-real-ip") ??
      "anonymous";

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
    /\.(png|jpg|svg|ico|css|js|webp|woff2?)$/.test(pathname)
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
    return NextResponse.next();
  }

  // --- Verification du token JWT ---
  const token = req.cookies.get("token")?.value;

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const now = Math.floor(Date.now() / 1000);
    const exp = typeof payload.exp === "number" ? payload.exp : 0;

    if (exp < now) {
      const res = pathname.startsWith("/api/")
        ? NextResponse.json({ error: "Session expiree" }, { status: 401 })
        : NextResponse.redirect(new URL("/login", req.url));
      res.cookies.delete("token");
      return res;
    }

    const role = typeof payload.role === "string" ? payload.role : "";

    if (pathname.startsWith("/admin") && role !== "admin") {
      return NextResponse.redirect(new URL("/restaurateur", req.url));
    }

    return NextResponse.next();
  } catch {
    if (pathname.startsWith("/api/")) {
      const res = NextResponse.json({ error: "Non autorise" }, { status: 401 });
      res.cookies.delete("token");
      return res;
    }
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.delete("token");
    return res;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
