import "server-only";

import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { notifications, pushSubscriptions } from "@/lib/db/schema";
import { transactionalDb } from "@/lib/db/transaction";
import {
  listClientNotificationsSchema,
  markClientNotificationsReadSchema,
  type ListClientNotificationsInput,
  type MarkClientNotificationsReadInput,
} from "./contracts";

export async function listClientNotifications(
  clientId: string,
  input: ListClientNotificationsInput,
) {
  const parsed = listClientNotificationsSchema.parse(input);
  const conditions = [eq(notifications.clientId, clientId)];
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
      id, user_id, client_id, type, expo_token, user_agent, created_at, last_used_at
    ) VALUES (
      ${id}, NULL, ${input.clientId}, 'expo', ${input.expoToken},
      ${input.userAgent ?? null}, NOW(), NOW()
    )
    ON CONFLICT (expo_token) WHERE expo_token IS NOT NULL
    DO UPDATE SET
      user_id = NULL,
      client_id = EXCLUDED.client_id,
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
