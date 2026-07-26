import { getClientSession } from "@/lib/api/auth-client";
import { apiResponse } from "@/lib/api/response";
import { db } from "@/lib/db";
import { createLogger } from "@/lib/logger";
import { NextRequest } from "next/server";

const log = createLogger("v1-client-commande-stream");

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { session, error } = await getClientSession(request);
  if (error) return error;

  const { id } = await params;
  const clientId = (await session).clientId;
  const readCommande = () =>
    db.query.commandes.findFirst({
      where: (commande, { and, eq }) =>
        and(eq(commande.id, id), eq(commande.clientId, clientId)),
      columns: { id: true, statut: true, updatedAt: true },
    });

  const commande = await readCommande();
  if (!commande) return apiResponse.notFound("Commande");

  const encoder = new TextEncoder();
  let isClosed = false;
  let lastVersion = commande.updatedAt.toISOString();

  const stream = new ReadableStream({
    start(controller) {
      const close = () => {
        if (isClosed) return;
        isClosed = true;
        controller.close();
      };
      const send = (event: string, data: unknown) => {
        if (isClosed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          isClosed = true;
        }
      };

      send("statut", { statut: commande.statut, commandeId: commande.id });
      if (commande.statut === "servie" || commande.statut === "annulee") {
        send("fin", { message: "Commande terminée" });
        close();
        return;
      }

      const pingInterval = setInterval(
        () => send("ping", { timestamp: Date.now() }),
        25_000,
      );
      const pollInterval = setInterval(async () => {
        if (isClosed) return;
        try {
          const current = await readCommande();
          if (!current) {
            send("fin", { message: "Commande introuvable" });
            clearInterval(pingInterval);
            clearInterval(pollInterval);
            close();
            return;
          }
          const version = current.updatedAt.toISOString();
          if (version !== lastVersion) {
            lastVersion = version;
            send("statut", {
              statut: current.statut,
              commandeId: current.id,
            });
          }
          if (current.statut === "servie" || current.statut === "annulee") {
            send("fin", { message: "Commande terminée" });
            clearInterval(pingInterval);
            clearInterval(pollInterval);
            close();
          }
        } catch (err) {
          log.error(
            { err, commandeId: id, clientId },
            "Erreur de lecture du suivi commande",
          );
        }
      }, 2_000);
      const timeout = setTimeout(() => {
        clearInterval(pingInterval);
        clearInterval(pollInterval);
        send("close", { reconnect: true });
        close();
      }, 5 * 60 * 1_000);

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
}
