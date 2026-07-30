import { after } from "next/server";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { invalidateRestaurantCache } from "@/lib/cache";
import { redis } from "@/lib/cache/redis";
import { calculerCommissionCommande } from "@/lib/db/mutations-admin";
import { db } from "@/lib/db";
import { sendNotification } from "@/lib/notifications";
import { pushSseEvent } from "@/lib/realtime/sse-push";
import { formatPrix } from "@/lib/utils/format";
import { STATUT_PREVIOUS_STATUSES } from "@/types/commandes";
import type { StatutCommande } from "./types";
import { commandes, plats, restaurants, type CommandeItemDB } from "./schema";
import { buildNouvelleCommandePayload } from "@/lib/realtime/sse-payloads";

export interface CreateCommandeInput {
  restaurantId: string;
  clientId?: string | null;
  idempotencyKey?: string;
  modeCommande: "sur_place" | "livraison" | "emporter";
  nomClient: string;
  telephoneClient?: string;
  numeroTable?: string;
  adresseLivraison?: string;
  latitudeLivraison?: number;
  longitudeLivraison?: number;
  distanceKm?: number;
  items: CommandeItemDB[];
  sousTotal: number;
  fraisLivraison?: number;
  remise?: number;
  total: number;
  noteClient?: string;
  tempsPreparationEstime?: number;
}

function genererNumeroCommande(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CMD-${date}-${rand}`;
}

async function getUserIdFromRestaurant(restaurantId: string): Promise<string> {
  const restaurant = await db.query.restaurants.findFirst({
    where: (restaurant, { eq }) => eq(restaurant.id, restaurantId),
    columns: { userId: true },
  });
  return restaurant!.userId;
}

export async function createCommande(input: CreateCommandeInput) {
  const commandeId = crypto.randomUUID();
  const numero = genererNumeroCommande();
  const values = {
    ...input,
    id: commandeId,
    numero,
    statut: "recue" as const,
    fraisLivraison: input.fraisLivraison ?? 0,
    remise: input.remise ?? 0,
  };
  const insertCommande =
    input.clientId && input.idempotencyKey
      ? db
          .insert(commandes)
          .values(values)
          .onConflictDoNothing({
            target: [commandes.clientId, commandes.idempotencyKey],
          })
      : db.insert(commandes).values(values);

  // neon-http ne prend pas en charge db.transaction(callback). Le batch est
  // néanmoins exécuté dans une transaction HTTP atomique. Les compteurs sont
  // protégés par l'identifiant généré : lors d'un rejeu idempotent, l'INSERT ne
  // crée aucune ligne et les UPDATE deviennent donc des no-op.
  const commandeCreee = sql`exists (
    select 1 from ${commandes} where ${commandes.id} = ${commandeId}
  )`;
  const operations: BatchItem<"pg">[] = [
    insertCommande,
    db
      .update(restaurants)
      .set({
        nombreCommandes: sql`${restaurants.nombreCommandes} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(restaurants.id, input.restaurantId),
          commandeCreee,
        ),
      ),
    ...input.items.map((item) =>
      db
        .update(plats)
        .set({
          nombreCommandes: sql`${plats.nombreCommandes} + ${item.quantite}`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(plats.id, item.platId),
            eq(plats.restaurantId, input.restaurantId),
            commandeCreee,
          ),
        ),
    ),
  ];

  await db.batch(
    operations as [BatchItem<"pg">, ...BatchItem<"pg">[]],
  );

  let commande =
    (await db.query.commandes.findFirst({
      where: (row, { eq }) => eq(row.id, commandeId),
    })) ?? null;
  const created = commande !== null;

  if (!commande && input.clientId && input.idempotencyKey) {
    commande =
      (await db.query.commandes.findFirst({
        where: (row, { and, eq }) =>
          and(
            eq(row.clientId, input.clientId!),
            eq(row.idempotencyKey, input.idempotencyKey!),
          ),
      })) ?? null;
  }
  if (!commande) throw new Error("Impossible de créer la commande");
  if (!created) return commande;

  after(async () => {
    const results = await Promise.allSettled([
      (async () =>
        sendNotification({
          userId: await getUserIdFromRestaurant(input.restaurantId),
          restaurantId: input.restaurantId,
          type: "nouvelle_commande",
          titre: "Nouvelle commande !",
          message: `Commande ${numero} de ${input.nomClient} — ${formatPrix(input.total)}`,
          lienType: "commande",
          lienId: commande.id,
          data: buildNouvelleCommandePayload(commande),
        }))(),
      invalidateRestaurantCache(input.restaurantId),
    ]);
    results.forEach((effect) => {
      if (effect.status === "rejected") {
        console.error("[createCommande] Effet secondaire en échec:", effect.reason);
      }
    });
  });
  return commande;
}

export async function updateStatutCommande(
  id: string,
  restaurantId: string,
  statut: StatutCommande,
) {
  const previousStatuses = STATUT_PREVIOUS_STATUSES[statut];
  if (previousStatuses.length === 0) return undefined;

  const now = new Date();
  const timestampFields: Partial<{ heureAcceptee: Date; heurePrete: Date; heureServie: Date }> = {};
  if (statut === "en_preparation") timestampFields.heureAcceptee = now;
  if (statut === "prete") timestampFields.heurePrete = now;
  if (statut === "servie") timestampFields.heureServie = now;

  const [commande] = await db.update(commandes).set({ statut, ...timestampFields, updatedAt: now })
    .where(and(
      eq(commandes.id, id),
      eq(commandes.restaurantId, restaurantId),
      inArray(commandes.statut, previousStatuses),
      ...(statut === "servie" ? [ne(commandes.modeCommande, "livraison")] : []),
    )).returning();
  if (!commande) return undefined;

  after(async () => {
    const queueKeyClient = `restauci:sse:client:queue:${id}`;
    const notification = statut === "prete" || statut === "annulee"
      ? sendNotification({
          userId: await getUserIdFromRestaurant(restaurantId),
          restaurantId,
          type: statut === "annulee" ? "commande_annulee" : "commande_prete",
          titre: statut === "annulee" ? "Commande annulée" : "Commande prête",
          message: `La commande #${commande.numero} est maintenant ${statut.replace("_", " ")}.`,
          lienType: "commande",
          lienId: id,
          data: { statut, numero: commande.numero, total: commande.total },
        })
      : Promise.resolve();
    const results = await Promise.allSettled([
      pushSseEvent(restaurantId, "statut", {
        statut, commandeId: id, lienId: id, numero: commande.numero,
        total: commande.total, timestamp: new Date().toISOString(),
      }),
      notification,
      (async () => {
        await redis.rpush(queueKeyClient, JSON.stringify({
          type: "statut",
          data: { statut, commandeId: id, timestamp: new Date().toISOString() },
        }));
        await redis.expire(queueKeyClient, 300);
      })(),
      invalidateRestaurantCache(restaurantId),
      statut === "servie" ? calculerCommissionCommande(id) : Promise.resolve(),
    ]);
    results.forEach((result) => {
      if (result.status === "rejected") console.error("[updateStatutCommande] Effet secondaire en échec:", result.reason);
    });
  });
  return commande;
}
