import { redis } from "@/lib/cache/redis";
import { db } from "@/lib/db";
import { restaurants } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { commandeLogger } from "@/lib/loggers";
import { eq } from "drizzle-orm";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const JWT_SECRET = new TextEncoder().encode(env.JWT_SECRET);

// Durée max d'une connexion SSE (4 minutes pour Vercel Pro)
const MAX_DURATION_MS = 4 * 60 * 1000;

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Vérifier la session via cookie
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return new Response("Non autorise", { status: 401 });
    }

    let payload: Record<string, unknown>;
    try {
      const verified = await jwtVerify(token, JWT_SECRET);
      payload = verified.payload as Record<string, unknown>;
    } catch (error) {
      commandeLogger.error(
        {
          error: error instanceof Error ? error.message : "Unknown error",
          stack:
            process.env.NODE_ENV === "development" && error instanceof Error
              ? error.stack
              : undefined,
        },
        "SSE auth error",
      );
      return new Response("Non autorise", { status: 401 });
    }

    const userId = typeof payload?.userId === "string" ? payload.userId : null;
    if (!userId) {
      return new Response("Non autorise", { status: 401 });
    }

    const [restaurant] = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.userId, userId))
      .limit(1);

    if (!restaurant) {
      return new Response("Restaurant introuvable", { status: 404 });
    }

    const restaurantId = restaurant.id;
    const queueKey = `restauci:sse:queue:${restaurantId}`;

    commandeLogger.info({ restaurantId }, "SSE connexion ouverte");

    const encoder = new TextEncoder();
    let isClosed = false;

    const stream = new ReadableStream({
      async start(controller) {
        // Helper pour envoyer un événement SSE
        const send = (event: string, data: unknown) => {
          if (isClosed) return;
          try {
            const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
            controller.enqueue(encoder.encode(payload));
          } catch {
            isClosed = true;
          }
        };

        // Ping initial pour confirmer la connexion
        send("ping", { timestamp: Date.now() });

        // Ping toutes les 30 secondes pour maintenir la connexion
        const pingInterval = setInterval(() => {
          send("ping", { timestamp: Date.now() });
        }, 30000);

        // Timeout après MAX_DURATION_MS
        const timeoutId = setTimeout(() => {
          clearInterval(pingInterval);
          clearInterval(pollInterval);
          if (!isClosed) {
            send("close", { reason: "timeout", reconnect: true });
            try {
              controller.close();
            } catch {
              /* ignore */
            }
            isClosed = true;
          }
        }, MAX_DURATION_MS);

        // Polling Redis pour les événements (toutes les 2 secondes)
        const pollInterval = setInterval(async () => {
          if (isClosed) {
            clearInterval(pollInterval);
            return;
          }

          try {
            const event = await redis.lpop<string>(queueKey);
            if (event) {
              const parsed = JSON.parse(event) as {
                type: string;
                data: unknown;
              };
              send(parsed.type, parsed.data);
            }
          } catch (err) {
            commandeLogger.warn({ err }, "Erreur polling SSE Redis");
          }
        }, 2000);

        // Nettoyer quand le client se déconnecte
        request.signal.addEventListener("abort", () => {
          isClosed = true;
          clearInterval(pingInterval);
          clearInterval(pollInterval);
          clearTimeout(timeoutId);
          commandeLogger.info(
            { restaurantId },
            "SSE connexion fermee par le client",
          );
        });
      },

      cancel() {
        isClosed = true;
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    commandeLogger.error(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        stack:
          process.env.NODE_ENV === "development" && error instanceof Error
            ? error.stack
            : undefined,
      },
      "SSE GET error",
    );
    return new Response("Erreur interne du serveur", { status: 500 });
  }
}
