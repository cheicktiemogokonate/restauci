// Ce fichier est appele depuis le serveur uniquement
// Les modules web-push et expo-server-sdk sont charges dynamiquement
// pour eviter les erreurs lors du build Next.js

import { redis } from "@/lib/cache/redis";
import { db } from "@/lib/db";
import { notifications, pushSubscriptions } from "@/lib/db/schema";
import { createLogger } from "@/lib/logger";
import { and, eq } from "drizzle-orm";

const log = createLogger("notifications");

export interface NotificationPayload {
  userId: string;
  restaurantId: string;
  type:
    | "nouvelle_commande"
    | "commande_prete"
    | "commande_annulee"
    | "nouveau_avis"
    | "systeme";
  titre: string;
  message: string;
  lienType?: string;
  lienId?: string;
  data?: Record<string, unknown>;
  son?: string;
  badge?: number;
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
  const { userId, restaurantId, type, titre, message, lienType, lienId, data } =
    payload;

  // 1. Persister en DB (synchrones — on veut s'assurer que c'est sauvegarde)
  try {
    await db.insert(notifications).values({
      userId,
      type: type,
      titre,
      message,
      lienType: lienType ?? null,
      lienId: lienId ?? null,
    });
  } catch (err) {
    log.error({ err }, "Erreur sauvegarde notification DB");
  }

  // 2-4. Envoyer via les canaux push en parallele (best-effort)
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
          : "/restaurateur",
      data: { type, lienId, lienType, ...data },
    }),

    // Expo Push (app mobile)
    sendExpoPush(userId, {
      titre,
      message,
      data: { type, lienId, lienType, ...data },
    }),
  ]);
}

// ——— SSE Helper ———————————————————

async function pushSseEvent(
  restaurantId: string,
  type: string,
  data: Record<string, unknown>,
): Promise<void> {
  const key = `restauci:sse:queue:${restaurantId}`;
  const event = JSON.stringify({ type, data, timestamp: Date.now() });

  try {
    await redis.rpush(key, event);
    await redis.expire(key, 300);
  } catch (err) {
    log.error({ err, restaurantId }, "Erreur push SSE event");
  }
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
    icon: payload.icon ?? "/icons/icon-192x192.png",
    badge: payload.badge ?? "/icons/badge-72x72.png",
    data: payload.data ?? {},
    timestamp: Date.now(),
  });

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      if (!sub.endpoint || !sub.p256dh || !sub.auth) return;

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

async function sendExpoPush(
  userId: string,
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
        eq(pushSubscriptions.userId, userId),
        eq(pushSubscriptions.type, "expo"),
      ),
    );

  if (subscriptions.length === 0) return;

  const expo = new Expo.Expo({
    accessToken: process.env.EXPO_ACCESS_TOKEN,
  });

  const messages: import("expo-server-sdk").ExpoPushMessage[] = subscriptions
    .filter(
      (sub): sub is typeof sub & { expoToken: string } =>
        sub.expoToken !== null &&
        sub.expoToken !== undefined &&
        Expo!.Expo.isExpoPushToken(sub.expoToken),
    )
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

  for (const chunk of chunks) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);

      for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i];
        if (ticket.status === "error") {
          if (ticket.details?.error === "DeviceNotRegistered") {
            const sub = subscriptions[i];
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
