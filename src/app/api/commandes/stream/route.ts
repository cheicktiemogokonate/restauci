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
const POLL_INTERVAL_MS = 1000;

interface StoredSseEvent {
  id?: string;
  type: string;
  data: unknown;
  timestamp?: number;
}

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
    const cursor = request.nextUrl.searchParams.get("cursor");

    commandeLogger.info({ restaurantId }, "SSE connexion ouverte");

    const encoder = new TextEncoder();
    let isClosed = false;
    let cleanup: (() => void) | undefined;

    const stream = new ReadableStream({
      async start(controller) {
        // Helper pour envoyer un événement SSE
        const send = (event: string, data: unknown, id?: string) => {
          if (isClosed) return;
          try {
            const eventId = id ? `id: ${id}\n` : "";
            const payload = `${eventId}event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
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

        const deliveredEventIds = new Set<string>();
        let initialized = false;

        // Lecture non destructive : contrairement à LPOP, chaque connexion
        // conserve son propre curseur et reçoit donc tous les événements.
        const pollInterval = setInterval(async () => {
          if (isClosed) {
            clearInterval(pollInterval);
            return;
          }

          try {
            const events = await redis.lrange<StoredSseEvent>(queueKey, 0, -1);

            if (!initialized) {
              const cursorIndex = cursor
                ? events.findIndex((event) => event.id === cursor)
                : -1;

              // Une nouvelle connexion ne rejoue pas les événements déjà
              // affichés. Après une reconnexion, seuls ceux postérieurs au
              // dernier identifiant reçu sont envoyés.
              const pending = cursorIndex >= 0 ? events.slice(cursorIndex + 1) : [];
              for (const event of pending) {
                const eventId = event.id ?? `${event.timestamp ?? 0}:${event.type}`;
                send(event.type, event.data, eventId);
              }
              for (const event of events) {
                deliveredEventIds.add(
                  event.id ?? `${event.timestamp ?? 0}:${event.type}`,
                );
              }
              initialized = true;
              return;
            }

            for (const event of events) {
              const eventId = event.id ?? `${event.timestamp ?? 0}:${event.type}`;
              if (deliveredEventIds.has(eventId)) continue;

              deliveredEventIds.add(eventId);
              send(event.type, event.data, eventId);
            }
          } catch (err) {
            commandeLogger.warn({ err }, "Erreur polling SSE Redis");
          }
        }, POLL_INTERVAL_MS);

        cleanup = () => {
          isClosed = true;
          clearInterval(pingInterval);
          clearInterval(pollInterval);
          clearTimeout(timeoutId);
        };

        // Nettoyer quand le client se déconnecte
        request.signal.addEventListener("abort", () => {
          cleanup?.();
          commandeLogger.info(
            { restaurantId },
            "SSE connexion fermee par le client",
          );
        });
      },

      cancel() {
        cleanup?.();
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
