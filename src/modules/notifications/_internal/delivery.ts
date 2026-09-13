// Ce fichier est appele depuis le serveur uniquement
// Les modules web-push et expo-server-sdk sont charges dynamiquement
// pour eviter les erreurs lors du build Next.js

import { db } from "@/infrastructure/db";
import { after } from "next/server";
import { pushSubscriptions } from "@/infrastructure/db/schema";
import { isAllowedWebPushEndpoint } from "./web-push-endpoint";
import { createLogger } from "@/infrastructure/logger";
import { pushSseEvent } from "@/infrastructure/realtime/sse-push";
import { and, eq } from "drizzle-orm";
import type { DbExecutor } from "@/infrastructure/db/transaction";
import type { NotificationWriteInput } from "../contracts";
import { persistNotificationRecord } from "./persistence";
import type {
  NotificationDestinationType,
  NotificationType,
} from "@/modules/notifications/model";

const log = createLogger("notifications");

export type PersistedNotificationInput = NotificationWriteInput;

type DeliverableNotificationType = Extract<
  NotificationType,
  | "nouvelle_commande"
  | "commande_prete"
  | "commande_annulee"
  | "restaurant_valide"
  | "restaurant_rejete"
  | "commission_cash_threshold"
  | "systeme"
>;

export interface NotificationPayload extends PersistedNotificationInput {
  userId: string;
  restaurantId: string;
  type: DeliverableNotificationType;
  data?: Record<string, unknown>;
  son?: string;
  badge?: number;
}

export interface ClientNotificationPayload {
  clientId: string;
  type: NotificationType;
  titre: string;
  message: string;
  lienType?: NotificationDestinationType;
  lienId?: string;
  eventId?: string;
  correlationId?: string;
  data?: Record<string, unknown>;
  son?: string;
  badge?: number;
}

export interface DriverNotificationPayload {
  driverId: string;
  type: NotificationType;
  titre: string;
  message: string;
  lienType?: NotificationDestinationType;
  lienId?: string;
  eventId?: string;
  correlationId?: string;
  data?: Record<string, unknown>;
  son?: string;
  badge?: number;
}

/** Écriture obligatoire, utilisable dans la transaction métier appelante. */
export async function persistNotification(
  executor: Pick<DbExecutor, "insert">,
  payload: PersistedNotificationInput,
) {
  return persistNotificationRecord(executor, payload);
}

/**
 * Envoie une notification via tous les canaux disponibles.
 * Ne bloque JAMAIS — les erreurs sont loggees et ignorees.
 *
 * Canaux :
 * 1. Base de donnees (persistant — toujours)
 * 2. SSE (temps reel navigateur — si connecte)
 * 3. Web Push (navigateur — si abonne)
 * 4. Expo Push (mobile颦— si abonne)
 */
export async function sendNotification(
  payload: NotificationPayload,
): Promise<void> {
  // 1. Persister en DB (synchrones — on veut s'assurer que c'est sauvegarde)
  try {
    await persistNotification(db, payload);
  } catch (err) {
    log.error({ err }, "Erreur sauvegarde notification DB");
  }

  await deliverNotification(payload);
}

/** Notification consommateur persistée puis diffusée sur ses appareils Expo. */
export async function sendClientNotification(
  payload: ClientNotificationPayload,
): Promise<void> {
  try {
    await persistNotification(db, payload);
  } catch (err) {
    log.error({ err }, "Erreur sauvegarde notification client");
  }
  await deliverClientNotification(payload);
}

export async function deliverClientNotification(
  payload: ClientNotificationPayload,
): Promise<void> {
  await sendClientExpoPush(payload.clientId, {
    titre: payload.titre,
    message: payload.message,
    data: {
      type: payload.type,
      lienType: payload.lienType,
      lienId: payload.lienId,
      ...payload.data,
    },
    son: payload.son,
    badge: payload.badge,
  });
}

export function scheduleClientNotification(payload: ClientNotificationPayload) {
  after(async () => {
    try {
      await deliverClientNotification(payload);
    } catch (err) {
      log.error({ err }, "Diffusion notification client impossible");
    }
  });
}

/** Notification livreur persistée puis diffusée sur ses appareils Expo. */
export async function sendDriverNotification(
  payload: DriverNotificationPayload,
): Promise<void> {
  try {
    await persistNotification(db, payload);
  } catch (err) {
    log.error({ err }, "Erreur sauvegarde notification livreur");
  }
  await sendDriverExpoPush(payload.driverId, {
    titre: payload.titre,
    message: payload.message,
    data: {
      type: payload.type,
      lienType: payload.lienType,
      lienId: payload.lienId,
      ...payload.data,
    },
    son: payload.son,
    badge: payload.badge,
  });
}

/** Diffusion externe seule après une persistance transactionnelle. */
export async function deliverDriverNotification(
  payload: DriverNotificationPayload,
): Promise<void> {
  await sendDriverExpoPush(payload.driverId, {
    titre: payload.titre,
    message: payload.message,
    data: {
      type: payload.type,
      lienType: payload.lienType,
      lienId: payload.lienId,
      ...payload.data,
    },
    son: payload.son,
    badge: payload.badge,
  });
}

export function scheduleDriverNotification(payload: DriverNotificationPayload) {
  after(async () => {
    try {
      await deliverDriverNotification(payload);
    } catch (err) {
      log.error({ err }, "Diffusion notification livreur impossible");
    }
  });
}

/** Diffusion externe uniquement ; ne crée aucune notification persistée. */
export async function deliverNotification(
  payload: NotificationPayload,
): Promise<void> {
  const { userId, restaurantId, type, titre, message, lienType, lienId, data } =
    payload;

  // Envoyer via les canaux push en parallèle (best-effort).
  // On utilise Promise.allSettled pour ne pas bloquer si l'un echoue
  await Promise.allSettled([
    // SSE temps reel (dashboard web ouvert)
    pushSseEvent(restaurantId, type, {
      titre,
      message,
      lienId,
      lienType,
      ...data,
    }),

    // Web Push (navigateur)
    sendWebPush(userId, {
      titre,
      message,
      url:
        lienType === "commande"
          ? `/restaurateur/commandes/${lienId}`
          : lienType === "profil"
            ? "/restaurateur/profil"
          : "/restaurateur",
      data: { type, lienId, lienType, ...data },
    }),

    // Expo Push (app mobile)
    sendUserExpoPush(userId, {
      titre,
      message,
      data: { type, lienId, lienType, ...data },
    }),
  ]);
}

// ——— Web Push ———————————————————

interface WebPushPayload {
  titre: string;
  message: string;
  url?: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
}

async function sendWebPush(
  userId: string,
  payload: WebPushPayload,
): Promise<void> {
  // Charger dynamiquement web-push seulement cote serveur
  let webPush: typeof import("web-push") | null;
  try {
    webPush = (await import("web-push")).default;
  } catch {
    log.warn("web-push module non disponible");
    return;
  }

  if (
    !process.env.VAPID_PUBLIC_KEY ||
    !process.env.VAPID_PRIVATE_KEY ||
    !process.env.VAPID_EMAIL
  ) {
    log.warn("Configuration VAPID absente, Web Push ignore");
    return;
  }

  const vapidSubject = process.env.VAPID_EMAIL.startsWith("mailto:")
    ? process.env.VAPID_EMAIL
    : `mailto:${process.env.VAPID_EMAIL}`;

  webPush.setVapidDetails(
    vapidSubject,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );

  const subscriptions = await db
    .select()
    .from(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.userId, userId),
        eq(pushSubscriptions.type, "web"),
      ),
    );

  if (subscriptions.length === 0) return;

  const notificationPayload = JSON.stringify({
    titre: payload.titre,
    message: payload.message,
    url: payload.url ?? "/restaurateur/commandes",
    icon: payload.icon ?? "/web-app-manifest-192x192.png",
    badge: payload.badge ?? "/web-app-manifest-192x192.png",
    data: payload.data ?? {},
    timestamp: Date.now(),
  });

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      if (!sub.endpoint || !sub.p256dh || !sub.auth) return;

      if (!isAllowedWebPushEndpoint(sub.endpoint)) {
        await db
          .delete(pushSubscriptions)
          .where(eq(pushSubscriptions.id, sub.id));
        log.warn(
          { subscriptionId: sub.id },
          "Subscription Web Push non autorisee supprimee",
        );
        return;
      }

      try {
        await webPush!.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          notificationPayload,
          { TTL: 24 * 3600, urgency: "high" },
        );

        // Mettre a jour lastUsedAt
        await db
          .update(pushSubscriptions)
          .set({ lastUsedAt: new Date() })
          .where(eq(pushSubscriptions.id, sub.id));
      } catch (err: unknown) {
        const statusCode =
          typeof err === "object" && err !== null && "statusCode" in err
            ? (err as { statusCode?: number }).statusCode
            : undefined;

        if (statusCode === 410 || statusCode === 404) {
          await db
            .delete(pushSubscriptions)
            .where(eq(pushSubscriptions.id, sub.id));
          log.info(
            { subscriptionId: sub.id },
            "Subscription expirée supprimee",
          );
        } else {
          log.error({ err, subscriptionId: sub.id }, "Erreur envoi Web Push");
        }
      }
    }),
  );
}

// ——— Expo Push ———————————————————

interface ExpoPushPayload {
  titre: string;
  message: string;
  data?: Record<string, unknown>;
  son?: string;
  badge?: number;
}

async function sendExpoPushToOwner(
  owner: { userId: string } | { clientId: string } | { driverId: string },
  payload: ExpoPushPayload,
): Promise<void> {
  let Expo: typeof import("expo-server-sdk") | null;
  try {
    Expo = await import("expo-server-sdk");
  } catch {
    log.warn("expo-server-sdk module non disponible");
    return;
  }

  const subscriptions = await db
    .select()
    .from(pushSubscriptions)
    .where(
      and(
        "userId" in owner
          ? eq(pushSubscriptions.userId, owner.userId)
          : "clientId" in owner
            ? eq(pushSubscriptions.clientId, owner.clientId)
            : eq(pushSubscriptions.driverId, owner.driverId),
        eq(pushSubscriptions.type, "expo"),
      ),
    );

  if (subscriptions.length === 0) return;

  const expo = new Expo.Expo({
    accessToken: process.env.EXPO_ACCESS_TOKEN,
  });

  const validSubscriptions = subscriptions.filter(
      (sub): sub is typeof sub & { expoToken: string } =>
        sub.expoToken !== null &&
        sub.expoToken !== undefined &&
        Expo!.Expo.isExpoPushToken(sub.expoToken),
    );
  const messages: import("expo-server-sdk").ExpoPushMessage[] = validSubscriptions
    .map((sub) => ({
      to: sub.expoToken,
      title: payload.titre,
      body: payload.message,
      data: payload.data ?? {},
      sound: (payload.son ?? "default") as "default",
      badge: payload.badge ?? 1,
    }));

  if (messages.length === 0) return;

  // Envoyer par chunks (max 100 par batch)
  const chunks = expo.chunkPushNotifications(messages);

  let subscriptionOffset = 0;
  for (const chunk of chunks) {
    const chunkSubscriptions = validSubscriptions.slice(
      subscriptionOffset,
      subscriptionOffset + chunk.length,
    );
    subscriptionOffset += chunk.length;
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);

      for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i];
        if (ticket.status === "error") {
          if (ticket.details?.error === "DeviceNotRegistered") {
            const sub = chunkSubscriptions[i];
            if (sub) {
              await db
                .delete(pushSubscriptions)
                .where(eq(pushSubscriptions.id, sub.id));
              log.info(
                { subscriptionId: sub.id },
                "Token Expo invalide supprime",
              );
            }
          } else {
            log.error({ ticket }, "Erreur ticket Expo Push");
          }
        }
      }
    } catch (err) {
      log.error({ err }, "Erreur envoi Expo Push batch");
    }
  }
}

async function sendUserExpoPush(
  userId: string,
  payload: ExpoPushPayload,
) {
  return sendExpoPushToOwner({ userId }, payload);
}

export async function sendClientExpoPush(
  clientId: string,
  payload: ExpoPushPayload,
) {
  return sendExpoPushToOwner({ clientId }, payload);
}

export async function sendDriverExpoPush(
  driverId: string,
  payload: ExpoPushPayload,
) {
  return sendExpoPushToOwner({ driverId }, payload);
}
