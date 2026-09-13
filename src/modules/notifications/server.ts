import "server-only";

import { and, count, desc, eq, inArray, notInArray, sql } from "drizzle-orm";
import { db } from "@/infrastructure/db";
import { notifications, pushSubscriptions } from "@/infrastructure/db/schema";
import { transactionalDb } from "@/infrastructure/db/transaction";
import {
  listClientNotificationsSchema,
  listUserNotificationsSchema,
  markUserNotificationsReadSchema,
  markClientNotificationsReadSchema,
  type ListClientNotificationsInput,
  type ListDriverNotificationsInput,
  type MarkClientNotificationsReadInput,
  type MarkDriverNotificationsReadInput,
  type ListUserNotificationsInput,
  type MarkUserNotificationsReadInput,
  type NotificationWriteInput,
  notificationProjectionEffectSchema,
  type NotificationProjectionEffect,
} from "./contracts";
import {
  HIDDEN_PRODUCT_NOTIFICATION_TYPES,
  renderNotificationTemplate,
} from "./model";
import type { DbExecutor } from "@/infrastructure/db/transaction";
import { persistNotificationRecord } from "./_internal/persistence";

const productVisibleNotificationCondition = notInArray(
  notifications.type,
  [...HIDDEN_PRODUCT_NOTIFICATION_TYPES],
);

/** Écriture produit obligatoire, utilisable dans la transaction métier. */
export async function persistNotification(
  executor: Pick<DbExecutor, "insert">,
  input: NotificationWriteInput,
) {
  return persistNotificationRecord(executor, input);
}

export async function persistNotificationProjection(
  executor: Pick<DbExecutor, "insert">,
  effect: NotificationProjectionEffect,
  causal: { eventId: string; correlationId: string },
) {
  const parsed = notificationProjectionEffectSchema.parse(effect);
  const projected = [];
  for (const item of parsed.payload.items) {
    const content = renderNotificationTemplate(item.template);
    const recipient =
      item.recipient.type === "user"
        ? { userId: item.recipient.id }
        : item.recipient.type === "client"
          ? { clientId: item.recipient.id }
          : { driverId: item.recipient.id };
    projected.push(
      await persistNotification(executor, {
        ...recipient,
        ...content,
        destination: item.destination,
        eventId: causal.eventId,
        correlationId: causal.correlationId,
      }),
    );
  }
  return projected.filter(Boolean);
}

export async function listUserNotifications(
  userId: string,
  input: ListUserNotificationsInput = {},
) {
  const parsed = listUserNotificationsSchema.parse(input);
  return db
    .select()
    .from(notifications)
    .where(
      and(eq(notifications.userId, userId), productVisibleNotificationCondition),
    )
    .orderBy(desc(notifications.createdAt))
    .limit(parsed.limit)
    .offset(parsed.offset);
}

export async function countUnreadUserNotifications(userId: string) {
  const [{ unreadCount }] = await db
    .select({ unreadCount: count() })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.lue, false),
        productVisibleNotificationCondition,
      ),
    );
  return Number(unreadCount);
}

export async function markUserNotificationsRead(
  userId: string,
  input: MarkUserNotificationsReadInput,
) {
  const parsed = markUserNotificationsReadSchema.parse(input);
  const rows = await db
    .update(notifications)
    .set({ lue: true, lueAt: new Date() })
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.lue, false),
        inArray(notifications.id, parsed.notificationIds),
      ),
    )
    .returning({ id: notifications.id });
  return { updated: rows.length };
}

export async function listClientNotifications(
  clientId: string,
  input: ListClientNotificationsInput,
) {
  const parsed = listClientNotificationsSchema.parse(input);
  const conditions = [
    eq(notifications.clientId, clientId),
    productVisibleNotificationCondition,
  ];
  if (parsed.unreadOnly) conditions.push(eq(notifications.lue, false));
  const where = and(...conditions);
  const offset = (parsed.page - 1) * parsed.limit;

  const [items, [{ total }], [{ unreadCount }]] = await Promise.all([
    db
      .select({
        id: notifications.id,
        type: notifications.type,
        title: notifications.titre,
        message: notifications.message,
        linkType: notifications.lienType,
        linkId: notifications.lienId,
        read: notifications.lue,
        readAt: notifications.lueAt,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(where)
      .orderBy(desc(notifications.createdAt))
      .limit(parsed.limit)
      .offset(offset),
    db.select({ total: count() }).from(notifications).where(where),
    db
      .select({ unreadCount: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.clientId, clientId),
          eq(notifications.lue, false),
          productVisibleNotificationCondition,
        ),
      ),
  ]);

  return {
    items,
    total: Number(total),
    unreadCount: Number(unreadCount),
    page: parsed.page,
    limit: parsed.limit,
  };
}

export async function markClientNotificationsRead(
  clientId: string,
  input: MarkClientNotificationsReadInput,
) {
  const parsed = markClientNotificationsReadSchema.parse(input);
  const conditions = [
    eq(notifications.clientId, clientId),
    eq(notifications.lue, false),
  ];
  if (parsed.notificationIds) {
    conditions.push(inArray(notifications.id, parsed.notificationIds));
  }
  const updated = await db
    .update(notifications)
    .set({ lue: true, lueAt: new Date() })
    .where(and(...conditions))
    .returning({ id: notifications.id });
  return { updated: updated.length };
}

export async function registerClientExpoSubscription(input: {
  clientId: string;
  expoToken: string;
  userAgent?: string | null;
}) {
  const id = crypto.randomUUID();
  await transactionalDb.execute(sql`
    INSERT INTO ${pushSubscriptions} (
      id, user_id, client_id, driver_id, type, expo_token, user_agent,
      created_at, last_used_at
    ) VALUES (
      ${id}, NULL, ${input.clientId}, NULL, 'expo', ${input.expoToken},
      ${input.userAgent ?? null}, NOW(), NOW()
    )
    ON CONFLICT (expo_token) WHERE expo_token IS NOT NULL
    DO UPDATE SET
      user_id = NULL,
      client_id = EXCLUDED.client_id,
      driver_id = NULL,
      type = 'expo',
      user_agent = EXCLUDED.user_agent,
      last_used_at = NOW()
  `);
  return { registered: true };
}

export async function unregisterClientExpoSubscription(input: {
  clientId: string;
  expoToken: string;
}) {
  const deleted = await db
    .delete(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.clientId, input.clientId),
        eq(pushSubscriptions.expoToken, input.expoToken),
        eq(pushSubscriptions.type, "expo"),
      ),
    )
    .returning({ id: pushSubscriptions.id });
  return { unregistered: deleted.length > 0 };
}

export async function registerUserExpoSubscription(input: {
  userId: string;
  expoToken: string;
}) {
  const existing = await db
    .select({ id: pushSubscriptions.id })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.expoToken, input.expoToken))
    .limit(1);

  if (existing[0]) {
    await db
      .update(pushSubscriptions)
      .set({
        userId: input.userId,
        clientId: null,
        driverId: null,
        type: "expo",
        lastUsedAt: new Date(),
      })
      .where(eq(pushSubscriptions.id, existing[0].id));
  } else {
    await db.insert(pushSubscriptions).values({
      userId: input.userId,
      type: "expo",
      expoToken: input.expoToken,
    });
  }
  return { registered: true };
}

const MAX_WEB_PUSH_SUBSCRIPTIONS_PER_USER = 10;

export async function registerUserWebPushSubscription(input: {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string | null;
}) {
  const existing = await db
    .select({ id: pushSubscriptions.id })
    .from(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.userId, input.userId),
        eq(pushSubscriptions.type, "web"),
        eq(pushSubscriptions.endpoint, input.endpoint),
      ),
    )
    .limit(1);

  if (existing[0]) {
    await db
      .update(pushSubscriptions)
      .set({
        p256dh: input.p256dh,
        auth: input.auth,
        lastUsedAt: new Date(),
      })
      .where(eq(pushSubscriptions.id, existing[0].id));
    return { registered: true, limitReached: false };
  }

  const subscriptions = await db
    .select({ id: pushSubscriptions.id })
    .from(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.userId, input.userId),
        eq(pushSubscriptions.type, "web"),
      ),
    )
    .limit(MAX_WEB_PUSH_SUBSCRIPTIONS_PER_USER);
  if (subscriptions.length >= MAX_WEB_PUSH_SUBSCRIPTIONS_PER_USER) {
    return { registered: false, limitReached: true };
  }

  await db.insert(pushSubscriptions).values({
    userId: input.userId,
    type: "web",
    endpoint: input.endpoint,
    p256dh: input.p256dh,
    auth: input.auth,
    userAgent: input.userAgent ?? undefined,
  });
  return { registered: true, limitReached: false };
}

export async function unregisterUserWebPushSubscription(input: {
  userId: string;
  endpoint: string;
}) {
  await db
    .delete(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.userId, input.userId),
        eq(pushSubscriptions.type, "web"),
        eq(pushSubscriptions.endpoint, input.endpoint),
      ),
    );
  return { unregistered: true };
}

export async function listDriverNotifications(
  driverId: string,
  input: ListDriverNotificationsInput,
) {
  const parsed = listClientNotificationsSchema.parse(input);
  const conditions = [
    eq(notifications.driverId, driverId),
    productVisibleNotificationCondition,
  ];
  if (parsed.unreadOnly) conditions.push(eq(notifications.lue, false));
  const where = and(...conditions);
  const offset = (parsed.page - 1) * parsed.limit;
  const [items, [{ total }], [{ unreadCount }]] = await Promise.all([
    db
      .select({
        id: notifications.id,
        type: notifications.type,
        title: notifications.titre,
        message: notifications.message,
        linkType: notifications.lienType,
        linkId: notifications.lienId,
        read: notifications.lue,
        readAt: notifications.lueAt,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(where)
      .orderBy(desc(notifications.createdAt))
      .limit(parsed.limit)
      .offset(offset),
    db.select({ total: count() }).from(notifications).where(where),
    db
      .select({ unreadCount: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.driverId, driverId),
          eq(notifications.lue, false),
          productVisibleNotificationCondition,
        ),
      ),
  ]);
  return {
    items,
    total: Number(total),
    unreadCount: Number(unreadCount),
    page: parsed.page,
    limit: parsed.limit,
  };
}

export async function markDriverNotificationsRead(
  driverId: string,
  input: MarkDriverNotificationsReadInput,
) {
  const parsed = markClientNotificationsReadSchema.parse(input);
  const conditions = [
    eq(notifications.driverId, driverId),
    eq(notifications.lue, false),
  ];
  if (parsed.notificationIds) {
    conditions.push(inArray(notifications.id, parsed.notificationIds));
  }
  const updated = await db
    .update(notifications)
    .set({ lue: true, lueAt: new Date() })
    .where(and(...conditions))
    .returning({ id: notifications.id });
  return { updated: updated.length };
}

export async function registerDriverExpoSubscription(input: {
  driverId: string;
  expoToken: string;
  userAgent?: string | null;
}) {
  const id = crypto.randomUUID();
  await transactionalDb.execute(sql`
    INSERT INTO ${pushSubscriptions} (
      id, user_id, client_id, driver_id, type, expo_token, user_agent,
      created_at, last_used_at
    ) VALUES (
      ${id}, NULL, NULL, ${input.driverId}, 'expo', ${input.expoToken},
      ${input.userAgent ?? null}, NOW(), NOW()
    )
    ON CONFLICT (expo_token) WHERE expo_token IS NOT NULL
    DO UPDATE SET
      user_id = NULL,
      client_id = NULL,
      driver_id = EXCLUDED.driver_id,
      type = 'expo',
      user_agent = EXCLUDED.user_agent,
      last_used_at = NOW()
  `);
  return { registered: true };
}

export async function unregisterDriverExpoSubscription(input: {
  driverId: string;
  expoToken: string;
}) {
  const deleted = await db
    .delete(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.driverId, input.driverId),
        eq(pushSubscriptions.expoToken, input.expoToken),
        eq(pushSubscriptions.type, "expo"),
      ),
    )
    .returning({ id: pushSubscriptions.id });
  return { unregistered: deleted.length > 0 };
}

type CountRow = { count: number | string };

/** Contrôle de dérive des destinations polymorphes connues. */
export async function countOrphanNotificationDestinations() {
  const result = await transactionalDb.execute(sql`
    SELECT COUNT(*)::int AS count
    FROM notifications AS notification
    WHERE notification.lien_type IS NOT NULL
      AND CASE notification.lien_type
        WHEN 'commande' THEN NOT EXISTS (
          SELECT 1 FROM commandes target WHERE target.id = notification.lien_id
        )
        WHEN 'livraison' THEN NOT EXISTS (
          SELECT 1 FROM livraisons target WHERE target.id = notification.lien_id
        )
        WHEN 'reservation_residence' THEN NOT EXISTS (
          SELECT 1 FROM residence_reservations target
          WHERE target.id::text = notification.lien_id
        )
        WHEN 'residence' THEN NOT EXISTS (
          SELECT 1 FROM residences target WHERE target.id::text = notification.lien_id
        )
        WHEN 'restaurant' THEN NOT EXISTS (
          SELECT 1 FROM restaurants target WHERE target.id = notification.lien_id
        )
        WHEN 'profil' THEN NOT EXISTS (
          SELECT 1 FROM restaurants target WHERE target.id = notification.lien_id
        )
        WHEN 'abonnement' THEN NOT EXISTS (
          SELECT 1 FROM subscription_periods target
          WHERE target.id = notification.lien_id
        ) AND NOT EXISTS (
          SELECT 1 FROM subscription_requests target
          WHERE target.id = notification.lien_id
        )
        WHEN 'remboursement' THEN NOT EXISTS (
          SELECT 1 FROM transactions target
          WHERE target.id = notification.lien_id
        )
        WHEN 'commission' THEN NOT EXISTS (
          SELECT 1 FROM commissions target WHERE target.id = notification.lien_id
        )
        WHEN 'remise_especes' THEN NOT EXISTS (
          SELECT 1 FROM driver_cash_remittances target
          WHERE target.id::text = notification.lien_id
        )
        WHEN 'verification_identite' THEN NOT EXISTS (
          SELECT 1 FROM partner_identity_verifications target
          WHERE target.id::text = notification.lien_id
        )
        ELSE TRUE
      END
  `);
  return Number((result.rows[0] as CountRow | undefined)?.count ?? 0);
}

/**
 * Politique Phase 10 approuvée : une destination absente supprime définitivement
 * sa notification, au lieu d’exposer un lien cassé.
 */
export async function deleteOrphanNotificationDestinations() {
  const result = await transactionalDb.execute(sql`
    SELECT prune_orphan_notifications()::int AS count
  `);
  return Number((result.rows[0] as CountRow | undefined)?.count ?? 0);
}

export {
  deliverClientNotification,
  deliverDriverNotification,
  deliverNotification,
  scheduleClientNotification,
  scheduleDriverNotification,
  sendClientExpoPush,
  sendClientNotification,
  sendDriverExpoPush,
  sendDriverNotification,
  sendNotification,
} from "./_internal/delivery";
export type {
  ClientNotificationPayload,
  DriverNotificationPayload,
  NotificationPayload,
} from "./_internal/delivery";
export {
  isAllowedWebPushEndpoint,
  isValidWebPushKey,
} from "./_internal/web-push-endpoint";
export type { NotificationWriteInput } from "./contracts";
