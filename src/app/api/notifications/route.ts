import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { createLogger } from "@/lib/logger";

const log = createLogger("notifications");

// GET query schema
const getNotificationsSchema = z.object({
  limit: z.string().default("20"),
  offset: z.string().default("0"),
});

// PATCH body schema
const markAsReadSchema = z.object({
  notificationIds: z.array(z.string()).min(1),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const parsed = getNotificationsSchema.safeParse({
      limit: searchParams.get("limit"),
      offset: searchParams.get("offset")
    });
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Paramètres de requête invalides" },
        { status: 400 }
      );
    }
    
    const limit = Math.max(1, Math.min(100, Number(parsed.data.limit)));
    const offset = Math.max(0, Number(parsed.data.offset));

    const [notifList, { count }] = await db.transaction(async (tx) => {
      const list = await tx
        .select({
          id: notifications.id,
          type: notifications.type,
          titre: notifications.titre,
          message: notifications.message,
          lienType: notifications.lienType,
          lienId: notifications.lienId,
          lue: notifications.lue,
          lueAt: notifications.lueAt,
          createdAt: notifications.createdAt,
        })
        .from(notifications)
        .where(eq(notifications.userId, session.userId))
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset);

      const [{ count }] = await tx
        .select({ count: sql<number>`count(*)` })
        .from(notifications)
        .where(and(
          eq(notifications.userId, session.userId),
          eq(notifications.lue, false)
        ));

      return [list, { count }];
    });

    return NextResponse.json({
      notifications: notifList,
      unreadCount: Number(count)
    });
  } catch (err) {
    log.error({ err }, "Erreur lors de la récupération des notifications");
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const json = await req.json();
    const result = markAsReadSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json(
        { error: "Données invalides", details: result.error.format() },
        { status: 400 }
      );
    }

    const { notificationIds } = result.data;

    await db
      .update(notifications)
      .set({
        lue: true,
        lueAt: new Date(),
      })
      .where(
        and(
          eq(notifications.userId, session.userId),
          eq(notifications.lue, false),
          // Using IN clause equivalent with OR conditions
          ...notificationIds.map(id => eq(notifications.id, id))
        )
      );

    return NextResponse.json({ success: true });
  } catch (err) {
    log.error({ err }, "Erreur lors de la mise à jour des notifications");
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}