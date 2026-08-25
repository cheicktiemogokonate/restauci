import type { NextRequest } from "next/server";

/**
 * IP du client, utilisée pour le rate limiting et la journalisation.
 *
 * Modèle de confiance : sur Vercel (déploiement actuel), la plateforme
 * ÉCRASE l'en-tête x-forwarded-for envoyé par le client et y place l'IP
 * réelle de connexion — la première valeur est donc fiable et non
 * falsifiable. Toute valeur fournie par le client est supprimée par l'edge
 * Vercel avant que le code applicatif ne s'exécute.
 *
 * ⚠️ Si l'application est un jour auto-hébergée derrière un reverse-proxy,
 * revalider ce modèle : il faudra alors configurer le proxy pour écraser
 * XFF lui-même, sinon un attaquant peut usurper son IP et contourner les
 * limiteurs de débit par IP.
 */
export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
