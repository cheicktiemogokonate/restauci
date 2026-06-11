import { NextRequest, NextResponse } from "next/server"
import { db, pool } from "@/lib/db"
import { commandes, restaurants } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { getCurrentUser } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get("token")?.value
  if (!token) {
    return new Response("Unauthorized", { status: 401 })
  }

  let payload: Record<string, unknown>
  try {
    const verified = await jwtVerify(token, JWT_SECRET)
    payload = verified.payload as any
  } catch (error) {
    console.error("[stream] Invalid token:", error)
    return new Response("Unauthorized", { status: 401 })
  }

  if ((payload as any).role !== "restaurateur") {
    return new Response("Forbidden", { status: 403 })
  }

  const restaurantId = (payload as any).restaurantId as string | undefined
  if (!restaurantId) {
    return new Response("Restaurant not found in token", { status: 401 })
  }

  try {
    // Vérifier que le restaurant existe et est actif
    const [restaurateur] = await db.select().from(restaurants).where(eq(restaurants.id, restaurantId)).limit(1)
    if (!restaurateur || !restaurateur.actif) {
      return new Response("Restaurant inactif", { status: 403 })
    }

    const client = await pool.connect()

    // Écouteur de notification PostgreSQL
    let onNotification: (payload: any) => void | Promise<void> = async () => {}

    try {
      await client.query("LISTEN nouvelle_commande")

      const stream = new ReadableStream({
        async start(controller) {
          // Gestionnaire d'erreur pour la requête de notification
          const onError = (err: Error) => {
            console.error("[stream] Notification error:", err)
          }

          client.on("notification", onNotification)

          const cleanup = async () => {
            client.removeListener("notification", onNotification)
            try {
              await client.query("UNLISTEN nouvelle_commande")
            } catch (error) {
              console.error("UNLISTEN error:", error)
            } finally {
              // Garder une référence à la fonction pour éviter de fermer deux fois
              if (!controller._closed) {
                controller.close()
              }
            }
          }

          request.signal.addEventListener("abort", cleanup)

          const handleNotification = async (payload: any) => {
            try {
              // Vérifier que la commande appartient au restaurant connecté
              const [cmd] = await db.select().from(commandes).where(eq(commandes.id, payload.commandeId)).limit(1)
              
              if (!cmd || cmd.restaurantId !== restaurateur.id) {
                return
              }

              // Envoyer l'événement dans le stream
              controller.enqueue(new TextEncoder().encode(JSON.stringify({ type: "commande", data: cmd }) + "\n\n"))
            } catch (error) {
              console.error("[stream] handleNotification error:", error)
            }
          }

          onNotification = async (payload: any, ...args: any[]) => {
            if (payload.channel === "nouvelle_commande") {
              await handleNotification(payload.payload)
            }
          }

        },
        pull(controller) {},
        type: ReadableStreamType.byob,
      }) as any

      const response = new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache,no-transform",
          Connection: "keep-alive",
        },
      })

      return response
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("[stream] GET error:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
}
