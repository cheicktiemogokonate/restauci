import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/modules/auth/server";
import { z } from "zod";
import { createLogger } from "@/infrastructure/logger";
import {
  countUnreadUserNotifications,
  listUserNotifications,
  markUserNotificationsRead,
} from "@/modules/notifications/server";

const log = createLogger("notifications");

// GET query schema
const getNotificationsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
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
      limit: searchParams.get("limit") ?? undefined,
      offset: searchParams.get("offset") ?? undefined,
    });
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Paramètres de requête invalides" },
        { status: 400 }
      );
    }
    
    const { limit, offset } = parsed.data;

    const [notifList, countRows] = await Promise.all([
      listUserNotifications(session.userId, { limit, offset }),
      countUnreadUserNotifications(session.userId),
    ]);

    return NextResponse.json({
      notifications: notifList,
      unreadCount: countRows,
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

    await markUserNotificationsRead(session.userId, { notificationIds });

    return NextResponse.json({ success: true });
  } catch (err) {
    log.error({ err }, "Erreur lors de la mise à jour des notifications");
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
