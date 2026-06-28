import { redis } from "@/lib/cache/redis";
import { createLogger } from "@/lib/logger";

const log = createLogger("pubsub");

/**
 * Canaux Redis Pub/Sub pour les événements temps réel.
 * Format : "restauci:{type}:{restaurantId}"
 */
export const channels = {
  commandes: (restaurantId: string) =>
    `restauci:commandes:${restaurantId}`,
  notifications: (userId: string) =>
    `restauci:notifications:${userId}`,
} as const;

export type RealtimeEventType =
  | "nouvelle_commande"
  | "statut_commande"
  | "nouveau_message"
  | "ping";

export interface RealtimeEvent {
  type:      RealtimeEventType;
  data:      Record<string, unknown>;
  timestamp: number;
}

/**
 * Publie un événement sur un canal Redis.
 * Appelé après chaque mutation qui doit être broadcastée.
 *
 * @param channel - Canal de publication
 * @param event   - Données de l'événement
 */
export async function publish(
  channel: string,
  event: RealtimeEvent
): Promise<void> {
  try {
    await redis.publish(channel, JSON.stringify(event));
    log.debug({ channel, type: event.type }, "Événement publié");
  } catch (err) {
    // Ne jamais bloquer la mutation si Redis est down
    log.error({ err, channel }, "Échec publication Redis Pub/Sub");
  }
}