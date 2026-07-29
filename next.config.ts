import type { NextConfig } from "next";

function getR2RemotePattern() {
  if (!process.env.R2_PUBLIC_URL) return null;

  try {
    const url = new URL(process.env.R2_PUBLIC_URL);
    if (
      url.protocol !== "https:" ||
      url.hostname.endsWith(".r2.cloudflarestorage.com")
    ) {
      return null;
    }

    const basePath = url.pathname.replace(/\/+$/, "");
    return {
      protocol: "https" as const,
      hostname: url.hostname,
      port: url.port,
      pathname: `${basePath}/**`,
    };
  } catch {
    return null;
  }
}

const r2RemotePattern = getR2RemotePattern();

const nextConfig: NextConfig = {
  poweredByHeader: false,
  ...(process.env.NEXT_DIST_DIR
    ? {
        distDir: process.env.NEXT_DIST_DIR,
        allowedDevOrigins: ["127.0.0.1"],
      }
    : {}),
  experimental: {
    optimizePackageImports: ["lucide-react", "motion/react"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      ...(r2RemotePattern ? [r2RemotePattern] : []),
    ],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  async headers() {
    const isProduction = process.env.NODE_ENV === "production";
    return [
      {
        // Exclut les assets internes Next.js (_next/static, _next/image)
        // pour éviter que le CSP / cache des headers de sécurité
        // n'interfère avec le HMR de Turbopack en développement.
        source: "/:path((?!_next/static|_next/image|favicon.ico).*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' https://fonts.gstatic.com",
              // MapLibre GL needs blob: for its web worker
              "worker-src 'self' blob:",
              // Allow fetching CARTO basemap styles, tiles and glyphs, plus OSRM/Nominatim.
              "connect-src 'self' https://basemaps.cartocdn.com https://*.basemaps.cartocdn.com https://router.project-osrm.org https://nominatim.openstreetmap.org",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "object-src 'none'",
              ...(isProduction ? ["upgrade-insecure-requests"] : []),
            ].join("; "),
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), payment=(), usb=()",
          },
          ...(isProduction
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=31536000; includeSubDomains",
                },
              ]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
