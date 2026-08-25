"use server";

import { transactionalDb as db } from "@/lib/db/transaction";
import { 
  subscriptionRequests, 
  subscriptionPeriods, 
  partnerAccounts,
} from "@/lib/db/schema";
import { eq, and, gt, ne, sql } from "drizzle-orm";
import { getAdminSession } from "@/lib/auth/get-admin-session";
import { revalidatePath, updateTag } from "next/cache";
import {
  buildReactivationDecision,
} from "@/lib/subscription-policy";
import { SUBSCRIPTION_PLANS_CACHE_TAG } from "@/lib/subscription-plans";
import { persistAuditLog } from "@/lib/audit";
import { persistNotification } from "@/lib/notifications";
import {
  cancelTransactionInTransaction,
  getSubscriptionTransactionInTransaction,
} from "@/modules/transactions/server";
import {
  publishSubscriptionCatalogueDraft,
  restoreSubscriptionCatalogueRevisionToDraft,
  saveSubscriptionCatalogueDraft,
  updateSubscriptionCatalogue,
  validateOfflineSubscriptionRequest,
  type OfflineSubscriptionPaymentMethod,
  type SubscriptionCataloguePayload,
  type UpdateSubscriptionCatalogueInput,
} from "@/modules/subscriptions/server";

/**
 * Valide une demande d'abonnement et crée la période correspondante.
 */
function cleanText(value: string, label: string, min: number, max: number) {
  const cleaned = value.trim();
  if (cleaned.length < min || cleaned.length > max) {
    throw new Error(`${label} doit contenir entre ${min} et ${max} caractères`);
  }
  return cleaned;
}

export async function validateSubscriptionRequest(
  requestId: string,
  moyenReglement?: OfflineSubscriptionPaymentMethod,
  referenceReglement?: string,
) {
  const session = await getAdminSession();
  const result = await validateOfflineSubscriptionRequest(session.userId, {
    requestId,
    paymentMethod: moyenReglement,
    paymentReference: referenceReglement,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/a-traiter");
  revalidatePath("/admin/abonnements");
  if (result.restaurantId) {
    revalidatePath(`/admin/restaurants/${result.restaurantId}`);
  }
  return result;
}

/**
 * Refuse une demande d'abonnement.
 */
export async function rejectSubscriptionRequest(requestId: string, motifRefus: string) {
  const session = await getAdminSession();
  const motif = cleanText(motifRefus, "Le motif", 5, 1000);

  const result = await db.transaction(async (tx) => {
    const request = await tx.query.subscriptionRequests.findFirst({
      where: eq(subscriptionRequests.id, requestId),
      with: { partnerAccount: { with: { user: true, restaurant: true } } },
    });

    if (!request || request.statut !== "en_attente") {
      throw new Error("Demande invalide ou déjà traitée");
    }

    const [processedRequest] = await tx.update(subscriptionRequests)
      .set({ 
        statut: "refusee",
        motifRefus: motif,
        traiteeParAdminId: session.userId,
        traiteeAt: new Date()
      })
      .where(
        and(
          eq(subscriptionRequests.id, requestId),
          eq(subscriptionRequests.statut, "en_attente"),
        ),
      )
      .returning({ id: subscriptionRequests.id });

    if (!processedRequest) {
      throw new Error("Cette demande a déjà été traitée");
    }

    if (request.prixFigeFcfa > 0) {
      const transaction = await getSubscriptionTransactionInTransaction(
        tx,
        request.id,
      );
      if (!transaction) {
        throw new Error("Transaction financière de l’abonnement introuvable");
      }
      await cancelTransactionInTransaction(tx, transaction.id);
    }

    await persistAuditLog(tx, {
      adminId: session.userId,
      action: "abonnement_refuse",
      ressourceType: "partner_account",
      ressourceId: request.partnerAccountId,
      details: { requestId, motifRefus: motif }
    });

    await persistNotification(tx, {
      userId: request.partnerAccount.userId,
      type: "abonnement_refuse",
      titre: "Abonnement refusé",
      message: `Votre demande d'abonnement a été refusée : ${motif}`,
      lienType: "abonnement",
    });

    return {
      success: true,
      restaurantId: request.partnerAccount.restaurant?.id ?? null,
    };
  });

  revalidatePath("/admin");
  revalidatePath("/admin/a-traiter");
  revalidatePath("/admin/abonnements");
  if (result.restaurantId) {
    revalidatePath(`/admin/restaurants/${result.restaurantId}`);
  }
  return result;
}

/**
 * Met à jour le catalogue des offres.
 */
export async function updateSubscriptionPlan(
  planCode: string,
  data: UpdateSubscriptionCatalogueInput,
) {
  const session = await getAdminSession();
  await updateSubscriptionCatalogue(session.userId, planCode, data);

  revalidatePath("/admin/abonnements");
  revalidatePath("/admin/parametres");
  revalidatePath("/");
  updateTag(SUBSCRIPTION_PLANS_CACHE_TAG);
}

export async function saveSubscriptionCatalogueDraftAction(
  data: SubscriptionCataloguePayload,
) {
  const session = await getAdminSession();
  const result = await saveSubscriptionCatalogueDraft(session.userId, data);
  revalidatePath("/admin/parametres");
  return result;
}

export async function publishSubscriptionCatalogueDraftAction() {
  const session = await getAdminSession();
  const result = await publishSubscriptionCatalogueDraft(session.userId);
  revalidatePath("/admin/parametres");
  revalidatePath("/restaurateur/facturation");
  revalidatePath("/partenaire/facturation");
  revalidatePath("/");
  updateTag(SUBSCRIPTION_PLANS_CACHE_TAG);
  return result;
}

export async function restoreSubscriptionCatalogueRevisionToDraftAction(
  revisionId: string,
) {
  const session = await getAdminSession();
  const result = await restoreSubscriptionCatalogueRevisionToDraft(
    session.userId,
    revisionId,
  );
  revalidatePath("/admin/parametres");
  return result;
}

/**
 * Suspend la période d'abonnement active d'un restaurant.
 */
export async function suspendreAbonnementAction(partnerAccountId: string, motif: string) {
  const session = await getAdminSession();

  const motifNettoye = cleanText(motif, "Le motif", 5, 1000);

  const result = await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT id FROM ${partnerAccounts} WHERE id = ${partnerAccountId} FOR UPDATE`,
    );
    const period = await tx.query.subscriptionPeriods.findFirst({
      where: and(
        eq(subscriptionPeriods.partnerAccountId, partnerAccountId),
        eq(subscriptionPeriods.statut, "active"),
        ne(subscriptionPeriods.planCode, "decouverte"),
        gt(subscriptionPeriods.dateEcheance, new Date()),
      ),
      with: { partnerAccount: { with: { user: true, restaurant: true } } },
    });

    if (!period) throw new Error("Aucun abonnement actif pour ce partenaire");

    const suspenduAt = new Date();
    const [updated] = await tx.update(subscriptionPeriods)
      .set({
        statut: "suspendue",
        motifSuspension: motifNettoye,
        suspenduParAdminId: session.userId,
        suspenduAt,
      })
      .where(
        and(
          eq(subscriptionPeriods.id, period.id),
          eq(subscriptionPeriods.statut, "active"),
        ),
      )
      .returning({ id: subscriptionPeriods.id });

    if (!updated) throw new Error("Cet abonnement a déjà été traité");

    await persistAuditLog(tx, {
      adminId: session.userId,
      action: "abonnement_suspendu",
      ressourceType: "partner_account",
      ressourceId: partnerAccountId,
      details: { periodId: period.id, motif: motifNettoye },
    });

    await persistNotification(tx, {
      userId: period.partnerAccount.userId,
      type: "abonnement_suspendu",
      titre: "Abonnement suspendu",
      message: `Votre abonnement a été suspendu. Motif : ${motifNettoye}`,
      lienType: "abonnement",
    });

    return { restaurantId: period.partnerAccount.restaurant?.id ?? null };
  });

  revalidatePath("/admin/abonnements");
  if (result.restaurantId) {
    revalidatePath(`/admin/restaurants/${result.restaurantId}`);
  }
}

export async function reactiverAbonnementAction(partnerAccountId: string) {
  const session = await getAdminSession();

  const outcome = await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT id FROM ${partnerAccounts} WHERE id = ${partnerAccountId} FOR UPDATE`,
    );
    const period = await tx.query.subscriptionPeriods.findFirst({
      where: and(
        eq(subscriptionPeriods.partnerAccountId, partnerAccountId),
        eq(subscriptionPeriods.statut, "suspendue"),
      ),
      orderBy: (periods, { desc }) => [desc(periods.suspenduAt)],
      with: { partnerAccount: { with: { user: true, restaurant: true } } },
    });

    if (!period) throw new Error("Aucun abonnement suspendu pour ce partenaire");

    const now = new Date();
    if (!period.dateEcheance) {
      throw new Error("Cette période payante ne possède pas d’échéance valide");
    }
    const decision = buildReactivationDecision(period.dateEcheance, now);
    if (!decision.reactivated) {
      await tx.update(subscriptionPeriods)
        .set(decision.update)
        .where(and(
          eq(subscriptionPeriods.id, period.id),
          eq(subscriptionPeriods.statut, "suspendue"),
        ));
      return {
        reactivated: false as const,
        restaurantId: period.partnerAccount.restaurant?.id ?? null,
      };
    }

    const [updated] = await tx
      .update(subscriptionPeriods)
      .set({
        ...decision.update,
        motifSuspension: null,
        suspenduParAdminId: null,
        suspenduAt: null,
      })
      .where(
        and(
          eq(subscriptionPeriods.id, period.id),
          eq(subscriptionPeriods.statut, "suspendue"),
        ),
      )
      .returning({ id: subscriptionPeriods.id });

    if (!updated) throw new Error("Cet abonnement a déjà été traité");

    await persistAuditLog(tx, {
      adminId: session.userId,
      action: "abonnement_reactive",
      ressourceType: "partner_account",
      ressourceId: partnerAccountId,
      details: { periodId: period.id, dateEcheance: period.dateEcheance },
    });

    await persistNotification(tx, {
      userId: period.partnerAccount.userId,
      type: "systeme",
      titre: "Abonnement réactivé",
      message: "Votre abonnement Toutci a été réactivé.",
      lienType: "abonnement",
    });
    return {
      reactivated: true as const,
      restaurantId: period.partnerAccount.restaurant?.id ?? null,
    };
  });

  if (!outcome.reactivated) {
    throw new Error("Cet abonnement a expiré pendant sa suspension et ne peut plus être réactivé");
  }

  revalidatePath("/admin");
  revalidatePath("/admin/a-traiter");
  revalidatePath("/admin/abonnements");
  if (outcome.restaurantId) {
    revalidatePath(`/admin/restaurants/${outcome.restaurantId}`);
  }
}
