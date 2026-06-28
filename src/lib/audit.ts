import { db }            from "@/lib/db";
import { auditLog }      from "@/lib/db/schema";
import { createLogger }  from "@/lib/logger";

const log = createLogger("audit");

export type AuditAction =
  | "restaurant_valide"
  | "restaurant_rejete"
  | "restaurant_suspendu"
  | "restaurant_reactive"
  | "user_suspendu"
  | "user_reactive"
  | "client_suspendu"
  | "client_reactive"
  | "commission_modifiee";

/**
 * Enregistre une action admin dans le journal d'audit.
 * Best-effort : ne bloque jamais l'action principale si ça échoue.
 */
export async function logAuditAction({
  adminId,
  action,
  ressourceType,
  ressourceId,
  details,
}: {
  adminId:       string;
  action:        AuditAction;
  ressourceType: "restaurant" | "user" | "client" | "commission";
  ressourceId:   string;
  details?:      Record<string, unknown>;
}): Promise<void> {
  try {
    await db.insert(auditLog).values({
      adminId,
      action,
      ressourceType,
      ressourceId,
      details,
    });
  } catch (err) {
    log.error({ err, action, ressourceId }, "Échec écriture audit log");
  }
}
