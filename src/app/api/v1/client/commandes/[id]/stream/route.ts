import { apiResponse } from "@/lib/api/response";
import { verifyToken } from "@/lib/auth";
import { redis } from "@/lib/cache/redis";
import { db } from "@/lib/db";
import { commandes } from "@/lib/db/schema";
import { createLogger } from "@/lib/logger";
import { and, eq } from "drizzle-orm";
import { NextRequest } from "next/server";

const log = createLogger("v1-client-commande-stream");

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const routeParams = await params;

  // Extract token from Authorization header or query param
  const authHeader = request.headers.get("authorization");
  const { searchParams } = new URL(request.url);
  const tokenFromQuery = searchParams.get("token");

  let token = null;
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  } else if (tokenFromQuery) {
    token = tokenFromQuery;
  }

  if (!token) {
    return apiResponse.error(
      "Token d'authentification manquant",
      "UNAUTHORIZED",
      { status: 401 },
    );
  }

  try {
    // Verify token
    const payload = await verifyToken(token);
    if (!payload?.clientId || payload.type !== "client") {
      return apiResponse.error("Token invalide", "UNAUTHORIZED", {
        status: 401,
      });
    }

    const clientId = payload.clientId as string;

    // Vérifier que la commande appartient au client
    const [commande] = await db
      .select({ id: commandes.id, statut: commandes.statut })
      .from(commandes)
      .where(
        and(eq(commandes.id, routeParams.id), eq(commandes.clientId, clientId)),
      )
      .limit(1);

    if (!commande) {
      return apiResponse.notFound("Commande");
    }

    // Si la commande est terminée → pas de stream
    if (["servie", "annulee"].includes(commande.statut)) {
      return apiResponse.success({ message: "Commande terminée" });
    }

    const encoder = new TextEncoder();
    let isClosed = false;
    const queueKey = `restauci:sse:client:queue:${routeParams.id}`;

    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          if (isClosed) return;
          try {
            controller.enqueue(
              encoder.encode(
                `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
              ),
            );
          } catch {
            isClosed = true;
          }
        };

        // Envoyer le statut actuel immédiatement
        send("statut", { statut: commande.statut, commandeId: commande.id });

        // Ping toutes les 30s
        const pingInterval = setInterval(() => {
          send("ping", { timestamp: Date.now() });
        }, 30_000);

        // Poll Redis pour les mises à jour de statut
        const pollInterval = setInterval(async () => {
          if (isClosed) {
            clearInterval(pollInterval);
            return;
          }
          try {
            const event = await redis.lpop<string>(queueKey);
            if (event) {
              const parsed = JSON.parse(event);
              send(parsed.type, parsed.data);

              // Fermer si la commande est terminée
              if (
                parsed.type === "statut" &&
                ["servie", "annulee"].includes(parsed.data?.statut)
              ) {
                send("fin", { message: "Commande terminée" });
                clearInterval(pollInterval);
                clearInterval(pingInterval);
                controller.close();
                isClosed = true;
              }
            }
          } catch (pollErr) {
            log.error(
              { err: pollErr, commandeId: routeParams.id, clientId },
              "Erreur de poll Redis SSE commande",
            );
          }
        }, 1500);

        // Timeout après 5 min
        const timeout = setTimeout(
          () => {
            clearInterval(pingInterval);
            clearInterval(pollInterval);
            if (!isClosed) {
              send("close", { reconnect: true });
              controller.close();
              isClosed = true;
            }
          },
          5 * 60 * 1000,
        );

        request.signal.addEventListener("abort", () => {
          isClosed = true;
          clearInterval(pingInterval);
          clearInterval(pollInterval);
          clearTimeout(timeout);
        });
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
  } catch (err) {
    log.error(
      { err, commandeId: routeParams.id },
      "Erreur initialisation stream SSE commande",
    );
    return apiResponse.internalError();
  }
}
