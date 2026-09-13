import type { NextRequest } from "next/server";

/**
 * IP du client, utilisée pour le rate limiting et la journalisation.
 *
 * Sur Vercel, la plateforme écrase `x-forwarded-for` avec l'adresse réelle.
 * En auto-hébergement, le reverse proxy devra garantir la même propriété.
 */
export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
