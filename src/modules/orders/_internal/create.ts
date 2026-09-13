import { and, eq, sql } from "drizzle-orm";
import { db, transactionalDb } from "@/infrastructure/db";
import {
  commandes,
  partnerAccounts,
  paymentProviderAccounts,
  subscriptionPlans,
  type CommandeItemDB,
} from "@/infrastructure/db/schema";
import type { Commande } from "@/infrastructure/db/types";
import {
  assertRestaurantDishesOrderable,
  lockRestaurantMenuForOrder,
  recordMenuDishOrdersAccepted,
} from "@/modules/menu/server";
import { MenuDomainError } from "@/modules/menu/model";
import {
  calculateRestaurantOrderAmounts,
  hashRestaurantOrderIntent,
  normalizeRestaurantOrderInput,
  RestaurantOrderError,
  type CreateRestaurantOrderInput,
} from "./creation-policy";
import {
  createCommissionSnapshot,
  getCashCommissionStatusInTransaction,
  reserveOrderRecoveryInTransaction,
} from "@/modules/commissions/server";
import { getClientOrderIdentity } from "@/modules/clients/server";
import { isRestaurantOrderable } from "@/modules/restaurants/model";
import {
  getRestaurantOrderCandidateBySlug,
  getRestaurantOrderContext,
  lockRestaurantForOrder,
  recordRestaurantOrderAccepted,
} from "@/modules/restaurants/server";
import {
  createPaymentAttemptInTransaction,
  createTransactionInTransaction,
} from "@/modules/transactions/server";
import { validateRestaurantOrderGeography } from "./geography";

export { RestaurantOrderError } from "../model";

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
    const restaurantCandidate = await getRestaurantOrderCandidateBySlug(
      normalizedInput.restaurantSlug,
      { executor: tx },
    );
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
    await lockRestaurantForOrder(restaurantCandidate.id, tx);
    await lockRestaurantMenuForOrder(restaurantCandidate.id, tx);

    const [restaurant, client] = await Promise.all([
      getRestaurantOrderContext(restaurantCandidate.id, { executor: tx }),
      getClientOrderIdentity(clientId, { executor: tx }),
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
    if (
      !isRestaurantOrderable({
        ...restaurant,
      })
    ) {
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
      dishes = await assertRestaurantDishesOrderable(
        restaurant.id,
        normalizedInput.items.map((item) => item.platId),
        { executor: tx },
      );
    } catch (error) {
      if (error instanceof MenuDomainError) {
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
      await recordRestaurantOrderAccepted(restaurant.id, tx);
      await recordMenuDishOrdersAccepted(
        restaurant.id,
        itemSnapshots.map((item) => ({
          dishId: item.platId,
          quantity: item.quantite,
        })),
        tx,
      );
    }

    return {
      commande: inserted,
      created: true,
      onlinePayment,
      effectContext: isCash
        ? {
            notificationUserId: restaurant.notificationUserId,
            clientName: client.nom,
          }
        : undefined,
    };
  });

  return transactionResult;
}
