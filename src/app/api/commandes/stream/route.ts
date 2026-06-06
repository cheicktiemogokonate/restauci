import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { db, pool } from "@/lib/db";
import { restaurants, commandes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-change-in-production"
);

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    payload = verified.payload as Record<string, unknown>;
  } catch (error) {
    console.error("SSE auth error:", error);
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = typeof payload?.userId === "string" ? payload.userId : null;
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const [restaurant] = await db
    .select()
    .from(restaurants)
    .where(eq(restaurants.userId, userId))
    .limit(1);

  if (!restaurant) {
    return new Response("Forbidden", { status: 403 });
  }

  const restaurantId = restaurant.id;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const client = await pool.connect();

      const cleanup = async () => {
        client.removeListener("notification", onNotification);
        try {
          await client.query("UNLISTEN nouvelle_commande");
        } catch (error) {
          console.error("UNLISTEN error:", error);
        }
        client.release();
      };

      const onNotification = async (msg: { channel: string; payload?: string | null }) => {
        if (msg.channel !== "nouvelle_commande" || !msg.payload) {
          return;
        }

        try {
          const data = JSON.parse(msg.payload) as {
            restaurantId: string;
            commandeId: string;
          };

          if (data.restaurantId !== restaurantId) {
            return;
          }

          const [commande] = await db
            .select()
            .from(commandes)
            .where(eq(commandes.id, data.commandeId))
            .limit(1);

          if (!commande) {
            return;
          }

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(commande)}\n\n`)
          );
        } catch (error) {
          console.error("SSE notification parse error:", error);
        }
      };

      client.on("notification", onNotification);
      try {
        await client.query("LISTEN nouvelle_commande");
      } catch (error) {
        console.error("LISTEN error:", error);
        controller.error(error);
        await cleanup();
        return;
      }

      request.signal.addEventListener("abort", async () => {
        await cleanup();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
