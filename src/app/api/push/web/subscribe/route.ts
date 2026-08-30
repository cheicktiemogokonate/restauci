import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { pushSubscriptions } from "@/lib/db/schema";
import { createLogger } from "@/lib/logger";
import {
  isAllowedWebPushEndpoint,
  isValidWebPushKey,
} from "@/lib/notifications/web-push-endpoint";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const log = createLogger("push-web-subscribe");

const subscribeSchema = z.object({
  endpoint: z.string().url().max(2_048).refine(isAllowedWebPushEndpoint),
  keys: z.object({
    p256dh: z.string().refine((value) => isValidWebPushKey(value, 65)),
    auth: z.string().refine((value) => isValidWebPushKey(value, 16)),
  }),
});

const unsubscribeSchema = z.object({
  endpoint: z.string().url().max(2_048).refine(isAllowedWebPushEndpoint),
});

const MAX_WEB_PUSH_SUBSCRIPTIONS_PER_USER = 10;

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
    }

    const parsed = subscribeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Donnees invalides" }, { status: 422 });
    }

    const { endpoint, keys } = parsed.data;

    const existing = await db
      .select({ id: pushSubscriptions.id })
      .from(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, user.userId),
          eq(pushSubscriptions.type, "web"),
          eq(pushSubscriptions.endpoint, endpoint),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(pushSubscriptions)
        .set({ p256dh: keys.p256dh, auth: keys.auth, lastUsedAt: new Date() })
        .where(eq(pushSubscriptions.id, existing[0].id));
    } else {
      const subscriptions = await db
        .select({ id: pushSubscriptions.id })
        .from(pushSubscriptions)
        .where(
          and(
            eq(pushSubscriptions.userId, user.userId),
            eq(pushSubscriptions.type, "web"),
          ),
        )
        .limit(MAX_WEB_PUSH_SUBSCRIPTIONS_PER_USER);

      if (subscriptions.length >= MAX_WEB_PUSH_SUBSCRIPTIONS_PER_USER) {
        return NextResponse.json(
          { error: "Nombre maximal d'appareils atteint" },
          { status: 409 },
        );
      }

      await db.insert(pushSubscriptions).values({
        userId: user.userId,
        type: "web",
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: req.headers.get("user-agent") ?? undefined,
      });
    }

    log.info({ userId: user.userId }, "Web Push subscription enregistree");
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      "POST /api/push/web/subscribe failed",
    );
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
    }

    const parsed = unsubscribeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Donnees invalides" }, { status: 422 });
    }

    await db
      .delete(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, user.userId),
          eq(pushSubscriptions.type, "web"),
          eq(pushSubscriptions.endpoint, parsed.data.endpoint),
        ),
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      "DELETE /api/push/web/subscribe failed",
    );
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 },
    );
  }
}
