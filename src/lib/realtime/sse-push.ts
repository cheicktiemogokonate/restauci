import { redis }        from "@/lib/cache/redis";
import { createLogger } from "@/lib/logger";
import { randomUUID } from "crypto";

const MAX_RETAINED_EVENTS = 100;

const log = createLogger("sse-push");

/**
 * Pousse un événement dans la queue SSE d'un restaurant.
 * La route SSE lit cette queue en polling toutes les secondes.
 *
 * @param restaurantId - Restaurant destinataire
 * @param type         - Type d'événement SSE
 * @param data         - Données de l'événement
 */
export async function pushSseEvent(
  restaurantId: string,
  type: string,
  data: Record<string, unknown>
): Promise<void> {
  const key   = `restauci:sse:queue:${restaurantId}`;
  const event = JSON.stringify({
    id: randomUUID(),
    type,
    data,
    timestamp: Date.now(),
  });

  try {
    // Ajouter en fin de queue (RPUSH = right push)
    await redis.rpush(key, event);

    // Les connexions SSE lisent cette liste sans la dépiler : chaque onglet
    // peut donc recevoir le même événement. La taille reste bornée.
    await redis.ltrim(key, -MAX_RETAINED_EVENTS, -1);

    // Expirer la queue après 5 minutes (nettoyage auto)
    await redis.expire(key, 300);
  } catch (err) {
    log.error({ err, restaurantId }, "Erreur push SSE event");
  }
}
