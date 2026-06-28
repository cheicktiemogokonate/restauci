import { redis }        from "@/lib/cache/redis";
import { createLogger } from "@/lib/logger";

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
  const event = JSON.stringify({ type, data, timestamp: Date.now() });

  try {
    // Ajouter en fin de queue (RPUSH = right push)
    await redis.rpush(key, event);

    // Expirer la queue après 5 minutes (nettoyage auto)
    await redis.expire(key, 300);
  } catch (err) {
    log.error({ err, restaurantId }, "Erreur push SSE event");
  }
}