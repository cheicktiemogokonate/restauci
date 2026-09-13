import "server-only";

import { env } from "@/infrastructure/env";
import { createHmac } from "node:crypto";

/**
 * Identifiant stable et non réversible pour les clés de sécurité et les logs.
 * Le préfixe permet d'éviter qu'un email et un téléphone identiques partagent
 * accidentellement la même clé.
 */
export function securityIdentifier(kind: string, value: string): string {
  return createHmac("sha256", env.JWT_SECRET)
    .update(`${kind}:${value.trim().toLowerCase()}`)
    .digest("hex");
}
