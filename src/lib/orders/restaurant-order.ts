import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { transactionalDb } from "@/lib/db/transaction";
import {
  categories,
  clients,
  commandes,
  partnerAccounts,
  paymentProviderAccounts,
  plats,
  restaurants,
  subscriptionPlans,
  type CommandeItemDB,
} from "@/lib/db/schema";
import type { Commande } from "@/lib/db/types";
import {
  assertDishesCommerciallyEligible,
  CommercialEligibilityError,
} from "@/lib/quota-entitlements";
import {
  calculateRestaurantOrderAmounts,
  hashRestaurantOrderIntent,
  normalizeRestaurantOrderInput,
  RestaurantOrderError,
  type CreateRestaurantOrderInput,
} from "./restaurant-order-intent";
import {
  createCommissionSnapshot,
  getCashCommissionStatusInTransaction,
  reserveOrderRecoveryInTransaction,
} from "@/lib/commissions/ledger";
import { isRestaurantOrderable } from "@/lib/restaurants/policy";
import {
  createPaymentAttemptInTransaction,
  createTransactionInTransaction,
} from "@/modules/transactions/server";
import { validateRestaurantOrderGeography } from "@/modules/orders/_internal/geography";

export { RestaurantOrderError } from "./restaurant-order-intent";

export type CreateRestaurantOrderResult = {
  commande: Commande;
  created: boolean;
  effectContext?: { notificationUserId: string; clientName: string };
  onlinePayment?: {
    paymentId: string;
    providerReference: string;
    checkoutUrl: string | null;
  };
};

function genererNumeroCommande(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase();
  return `CMD-${date}-${suffix}`;
}

async function findIdempotentOrder(clientId: string, idempotencyKey: string) {
  return db.query.commandes.findFirst({
    where: (row, { and, eq }) =>
      and(
        eq(row.clientId, clientId),
        eq(row.idempotencyKey, idempotencyKey),
      ),
    with: { financialTransaction: { with: { payments: true } } },
  });
}

function assertMatchingIntent(
  existing: Commande & { financialTransaction?: { payments: Array<{ id: string; provider: string | null; providerReference: string | null; checkoutUrl: string | null; status: string }> } | null },
  requestHash: string,
): CreateRestaurantOrderResult {
  if (existing.idempotencyRequestHash !== requestHash) {
    throw new RestaurantOrderError(
      "IDEMPOTENCY_CONFLICT",
      "Cette clé d’idempotence a déjà été utilisée pour une autre commande.",
    );
  }
  const paystackPayment = existing.financialTransaction?.payments
    .filter((payment) => payment.provider === "paystack" && payment.status === "pending")
    .at(-1);
  return {
    commande: existing,
    created: false,
    onlinePayment: paystackPayment?.providerReference
      ? {
          paymentId: paystackPayment.id,
          providerReference: paystackPayment.providerReference,
          checkoutUrl: paystackPayment.checkoutUrl,
        }
      : undefined,
  };
}

export async function createRestaurantOrder({
  clientId,
  idempotencyKey,
  input,
}: {
  clientId: string;
  idempotencyKey: string;
  input: CreateRestaurantOrderInput;
}): Promise<CreateRestaurantOrderResult> {
  const normalizedInput = normalizeRestaurantOrderInput(input);
  const requestHash = hashRestaurantOrderIntent(normalizedInput);
  const existing = await findIdempotentOrder(clientId, idempotencyKey);
  if (existing) return assertMatchingIntent(existing, requestHash);

  const transactionResult = await transactionalDb.transaction(async (tx) => {
    const restaurantCandidate = await tx.query.restaurants.findFirst({
      where: eq(restaurants.slug, normalizedInput.restaurantSlug),
      columns: { id: true, partnerAccountId: true },
    });
    if (!restaurantCandidate) {
      throw new RestaurantOrderError(
        "RESTAURANT_NOT_FOUND",
        "Restaurant introuvable.",
      );
    }

    // Les mutations d'abonnement verrouillent le même partner_account. Les
    // verrous partagés sur le catalogue et le menu empêchent un changement de
    // prix, publication, quota ou livraison entre la validation et l'INSERT.
    await tx.execute(
      sql`SELECT id FROM ${partnerAccounts} WHERE id = ${restaurantCandidate.partnerAccountId} FOR UPDATE`,
    );
    const isCash = normalizedInput.paymentMethod === "cash";
    const cashStatus = isCash
      ? await getCashCommissionStatusInTransaction(tx, restaurantCandidate.partnerAccountId)
      : null;
    if (cashStatus && !cashStatus.cashAllowed) {
      throw new RestaurantOrderError("CASH_NOT_ALLOWED", "Les commandes payées sur place sont temporairement indisponibles jusqu’à la régularisation des commissions.");
    }
    const providerAccount = !isCash
      ? await tx.query.paymentProviderAccounts.findFirst({
          where: and(
            eq(paymentProviderAccounts.partnerAccountId, restaurantCandidate.partnerAccountId),
            eq(paymentProviderAccounts.provider, "paystack"),
            eq(paymentProviderAccounts.status, "active"),
          ),
        })
      : null;
    if (!isCash && !providerAccount) {
      throw new RestaurantOrderError("ONLINE_PAYMENT_UNAVAILABLE", "Le paiement électronique n’est pas encore disponible pour ce restaurant.");
    }
    await tx.execute(sql`SELECT id FROM ${subscriptionPlans} FOR SHARE`);
    await tx.execute(
      sql`SELECT id FROM ${restaurants} WHERE id = ${restaurantCandidate.id} FOR SHARE`,
    );
    await tx.execute(
      sql`SELECT id FROM ${categories} WHERE restaurant_id = ${restaurantCandidate.id} FOR SHARE`,
    );
    await tx.execute(
      sql`SELECT id FROM ${plats} WHERE restaurant_id = ${restaurantCandidate.id} FOR SHARE`,
    );

    const [restaurant, client] = await Promise.all([
      tx.query.restaurants.findFirst({
        where: eq(restaurants.id, restaurantCandidate.id),
        columns: {
          id: true,
          actif: true,
          enLigne: true,
          accepteCommandes: true,
          suspendu: true,
          fraisLivraison: true,
          commandeMinimum: true,
          modesCommande: true,
          serviceMarketId: true,
          serviceMarketVersionId: true,
        },
        with: { partnerAccount: { columns: { userId: true } } },
      }),
      tx.query.clients.findFirst({
        where: and(eq(clients.id, clientId), eq(clients.actif, true)),
        columns: { id: true, nom: true, telephone: true },
      }),
    ]);

    if (!client) {
      throw new RestaurantOrderError("CLIENT_NOT_FOUND", "Client introuvable.");
    }
    if (!restaurant) {
      throw new RestaurantOrderError(
        "RESTAURANT_NOT_FOUND",
        "Restaurant introuvable.",
      );
    }
    if (!isRestaurantOrderable(restaurant)) {
      throw new RestaurantOrderError(
        "RESTAURANT_NOT_ORDERABLE",
        "Ce restaurant n’accepte pas de commandes actuellement.",
      );
    }
    if (!restaurant.modesCommande?.includes(normalizedInput.modeCommande)) {
      throw new RestaurantOrderError(
        "ORDER_MODE_NOT_SUPPORTED",
        "Ce mode de commande n’est pas proposé par le restaurant.",
      );
    }

    // Autorisation géographique avant toute validation financière, commission
    // ou tentative provider. En mode shadow, le helper observe sans bloquer.
    const geographySnapshot = await validateRestaurantOrderGeography(
      tx,
      restaurant,
      normalizedInput,
    );

    let dishes;
    try {
      dishes = await assertDishesCommerciallyEligible(
        restaurant.id,
        normalizedInput.items.map((item) => item.platId),
        { executor: tx },
      );
    } catch (error) {
      if (error instanceof CommercialEligibilityError) {
        throw new RestaurantOrderError(
          "DISH_NOT_ORDERABLE",
          "Un ou plusieurs plats ne sont plus disponibles à la commande.",
        );
      }
      throw error;
    }

    const dishesById = new Map(dishes.map((dish) => [dish.id, dish]));
    const itemSnapshots: CommandeItemDB[] = normalizedInput.items.map((item) => {
      const dish = dishesById.get(item.platId);
      if (!dish) {
        throw new RestaurantOrderError(
          "DISH_NOT_ORDERABLE",
          "Un ou plusieurs plats ne sont plus disponibles à la commande.",
        );
      }
      return {
        platId: dish.id,
        nom: dish.nom,
        prix: dish.prix,
        quantite: item.quantite,
        totalLigne: dish.prix * item.quantite,
      };
    });

    const { sousTotal, fraisLivraison, remise, total } =
      calculateRestaurantOrderAmounts({
        items: itemSnapshots,
        modeCommande: normalizedInput.modeCommande,
        fraisLivraisonFcfa: restaurant.fraisLivraison,
        commandeMinimumFcfa: restaurant.commandeMinimum,
      });
    const commandeId = crypto.randomUUID();
    const numero = genererNumeroCommande();

    const [inserted] = await tx
      .insert(commandes)
      .values({
        id: commandeId,
        numero,
        restaurantId: restaurant.id,
        clientId,
        idempotencyKey,
        idempotencyRequestHash: requestHash,
        modeCommande: normalizedInput.modeCommande,
        statut: isCash ? "recue" : "en_attente_paiement",
        numeroTable:
          normalizedInput.modeCommande === "sur_place"
            ? normalizedInput.numeroTable
            : null,
        nomClient: client.nom,
        telephoneClient: client.telephone,
        adresseLivraison:
          normalizedInput.modeCommande === "livraison"
            ? normalizedInput.adresseLivraison
            : null,
        latitudeLivraison:
          normalizedInput.modeCommande === "livraison"
            ? normalizedInput.latitudeLivraison
            : null,
        longitudeLivraison:
          normalizedInput.modeCommande === "livraison"
            ? normalizedInput.longitudeLivraison
            : null,
        items: itemSnapshots,
        sousTotal,
        fraisLivraison,
        remise,
        total,
        noteClient: normalizedInput.noteClient,
        ...(geographySnapshot ?? {}),
      })
      .onConflictDoNothing({
        target: [commandes.clientId, commandes.idempotencyKey],
      })
      .returning();

    if (!inserted) {
      const replay = await tx.query.commandes.findFirst({
        where: (row, { and, eq }) =>
          and(
            eq(row.clientId, clientId),
            eq(row.idempotencyKey, idempotencyKey),
          ),
        with: { financialTransaction: { with: { payments: true } } },
      });
      if (!replay) throw new Error("Échec de la résolution idempotente");
      return {
        ...assertMatchingIntent(replay, requestHash),
      };
    }

    const commission = await createCommissionSnapshot(tx, {
      orderId: inserted.id,
      partnerAccountId: restaurantCandidate.partnerAccountId,
      baseAmountFcfa: sousTotal + fraisLivraison,
      collectionMode: isCash ? "cash_receivable" : "provider_split",
    });

    let onlinePayment: CreateRestaurantOrderResult["onlinePayment"];
    if (total > 0) {
      const financialTransaction = await createTransactionInTransaction(tx, {
        type: "commande_restaurant",
        restaurantOrderId: inserted.id,
        partnerAccountId: restaurantCandidate.partnerAccountId,
        clientId,
        amountFcfa: total,
      });
      if (isCash) {
        await createPaymentAttemptInTransaction(tx, {
          transactionId: financialTransaction.id,
          amountFcfa: total,
          method: "cash",
          provider: null,
          idempotencyKey: `commande-cash:${inserted.id}`,
        });
      } else {
        const providerReference = `toutci-order-${crypto.randomUUID()}`;
        const recovery = await reserveOrderRecoveryInTransaction(tx, {
          partnerAccountId: restaurantCandidate.partnerAccountId,
          normalPartnerNetFcfa: total - commission.amountFcfa,
          reservationReference: `recovery-${providerReference}`,
        });
        const payment = await createPaymentAttemptInTransaction(tx, {
          transactionId: financialTransaction.id,
          amountFcfa: total,
          method: normalizedInput.paymentMethod,
          provider: "paystack",
          providerReference,
          recoverySettlementId: recovery?.id ?? null,
          idempotencyKey: `commande-paystack:${inserted.id}:1`,
        });
        onlinePayment = {
          paymentId: payment.id,
          providerReference,
          checkoutUrl: null,
        };
      }
    }

    if (isCash) {
      await tx
        .update(restaurants)
        .set({
          nombreCommandes: sql`${restaurants.nombreCommandes} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(restaurants.id, restaurant.id));

      const requestedItems = sql.join(
        itemSnapshots.map((item) => sql`(${item.platId}, ${item.quantite})`),
        sql`, `,
      );
      await tx.execute(sql`
        UPDATE "plats" AS dish
        SET
          "nombre_commandes" = dish."nombre_commandes" + requested.quantity::integer,
          "updated_at" = NOW()
        FROM (VALUES ${requestedItems}) AS requested(id, quantity)
        WHERE dish."id" = requested.id::varchar
          AND dish."restaurant_id" = ${restaurant.id}
      `);
    }

    return {
      commande: inserted,
      created: true,
      onlinePayment,
      effectContext: isCash
        ? {
            notificationUserId: restaurant.partnerAccount.userId,
            clientName: client.nom,
          }
        : undefined,
    };
  });

  return transactionResult;
}
