import { getCurrentUser } from "@/modules/auth/server";
import { createLogger } from "@/infrastructure/logger";
import {
  isAllowedWebPushEndpoint,
  isValidWebPushKey,
} from "@/modules/notifications/server";
import {
  registerUserWebPushSubscription,
  unregisterUserWebPushSubscription,
} from "@/modules/notifications/server";
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

    const registration = await registerUserWebPushSubscription({
      userId: user.userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent: req.headers.get("user-agent"),
    });
    if (registration.limitReached) {
      return NextResponse.json(
        { error: "Nombre maximal d'appareils atteint" },
        { status: 409 },
      );
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

    await unregisterUserWebPushSubscription({
      userId: user.userId,
      endpoint: parsed.data.endpoint,
    });

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
