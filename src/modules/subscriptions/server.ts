import "server-only";

import { and, desc, eq, gt, inArray, lte, ne, sql } from "drizzle-orm";
import { persistAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import {
  partnerAccounts,
  restaurants,
  subscriptionPeriodLimits,
  subscriptionPeriods,
  subscriptionPlanLimits,
  subscriptionPlans,
  subscriptionRequests,
} from "@/lib/db/schema";
import {
  transactionalDb,
  type DbExecutor,
  type TransactionExecutor,
} from "@/lib/db/transaction";
import { persistNotification } from "@/lib/notifications";
import { getEffectivePlan } from "@/lib/subscription-plans";
import {
  addOneSubscriptionYear,
  buildUpgradeClosure,
  evaluateSubscriptionTransition,
  subscriptionTransitionError,
} from "@/lib/subscription-policy";
import {
  createPaymentAttemptInTransaction,
  createTransactionInTransaction,
  getSubscriptionTransactionInTransaction,
  recordConfirmedOfflinePaymentInTransaction,
} from "@/modules/transactions/server";
import { mapOfflinePaymentMethod } from "@/modules/transactions/model";
import {
  partnerSubscriptionRequestSchema,
  subscriptionCataloguePayloadSchema,
  subscriptionCatalogueRevisionIdSchema,
  subscriptionPlanCodeSchema,
  updateSubscriptionCatalogueSchema,
  validateOfflineSubscriptionRequestSchema,
  type PartnerSubscriptionRequestInput,
  type SubscriptionCataloguePayload,
  type UpdateSubscriptionCatalogueInput,
  type ValidateOfflineSubscriptionRequestInput,
} from "./contracts";
import {
  getAdminSubscriptionCatalogueWorkspaceRecord,
  getCurrentSubscriptionCataloguePayloadRecord,
  publishSubscriptionCatalogueDraftRecord,
  restoreSubscriptionCatalogueRevisionToDraftRecord,
  saveSubscriptionCatalogueDraftRecord,
} from "./_internal/catalogue";

export function getPublishedSubscriptionCatalogue() {
  return getCurrentSubscriptionCataloguePayloadRecord();
}

export function getAdminSubscriptionCatalogueWorkspace() {
  return getAdminSubscriptionCatalogueWorkspaceRecord();
}

export function saveSubscriptionCatalogueDraft(
  adminId: string,
  input: SubscriptionCataloguePayload,
) {
  return saveSubscriptionCatalogueDraftRecord(
    adminId,
    subscriptionCataloguePayloadSchema.parse(input),
  );
}

export function publishSubscriptionCatalogueDraft(adminId: string) {
  return publishSubscriptionCatalogueDraftRecord(adminId);
}

export function restoreSubscriptionCatalogueRevisionToDraft(
  adminId: string,
  revisionId: string,
) {
  return restoreSubscriptionCatalogueRevisionToDraftRecord(
    adminId,
    subscriptionCatalogueRevisionIdSchema.parse(revisionId),
  );
}

async function getSubscriptionActivationContext(
  tx: TransactionExecutor,
  input: { requestId: string; now: Date },
) {
  const request = await tx.query.subscriptionRequests.findFirst({
    where: eq(subscriptionRequests.id, input.requestId),
    with: { partnerAccount: { with: { user: true, restaurant: true } } },
  });
  if (!request || request.statut !== "en_attente") {
    throw new Error("Demande invalide ou déjà traitée");
  }

  await tx.execute(
    sql`SELECT id FROM ${partnerAccounts} WHERE id = ${request.partnerAccountId} FOR UPDATE`,
  );
  if (
    request.partnerAccount.activityType === "restaurant" &&
    (!request.partnerAccount.restaurant?.actif ||
      request.partnerAccount.restaurant.suspendu)
  ) {
    throw new Error("Le partenaire Restaurant doit être actif avant validation");
  }

  await tx
    .update(subscriptionPeriods)
    .set({
      statut: "expiree",
      endedAt: sql`${subscriptionPeriods.dateEcheance}`,
      endReason: "expiration_naturelle",
    })
    .where(
      and(
        eq(subscriptionPeriods.partnerAccountId, request.partnerAccountId),
        inArray(subscriptionPeriods.statut, ["active", "suspendue"]),
        ne(subscriptionPeriods.planCode, "decouverte"),
        lte(subscriptionPeriods.dateEcheance, input.now),
      ),
    );

  const plan = await tx.query.subscriptionPlans.findFirst({
    where: eq(subscriptionPlans.code, request.planCode),
    with: {
      limits: {
        where: eq(
          subscriptionPlanLimits.activityType,
          request.partnerAccount.activityType,
        ),
      },
    },
  });
  if (!plan) throw new Error("Offre d’abonnement introuvable");

  const expectedResources =
    request.partnerAccount.activityType === "restaurant"
      ? new Set(["category", "dish"])
      : new Set(["residence"]);
  const snapshotLimits = plan.limits.filter((limit) =>
    expectedResources.has(limit.resourceType),
  );
  if (
    snapshotLimits.length !== expectedResources.size ||
    new Set(snapshotLimits.map((limit) => limit.resourceType)).size !==
      expectedResources.size
  ) {
    throw new Error(`Configuration de quotas incomplète pour l'offre ${plan.code}`);
  }

  const currentPeriod = await tx.query.subscriptionPeriods.findFirst({
    where: and(
      eq(subscriptionPeriods.partnerAccountId, request.partnerAccountId),
      inArray(subscriptionPeriods.statut, ["active", "suspendue"]),
      ne(subscriptionPeriods.planCode, "decouverte"),
      lte(subscriptionPeriods.dateDebut, input.now),
      gt(subscriptionPeriods.dateEcheance, input.now),
    ),
    orderBy: [desc(subscriptionPeriods.dateDebut)],
  });
  const currentPlan = currentPeriod
    ? await tx.query.subscriptionPlans.findFirst({
        where: eq(subscriptionPlans.code, currentPeriod.planCode),
      })
    : null;
  const transition = evaluateSubscriptionTransition(currentPlan ?? null, plan);
  if (!transition.allowed) {
    throw new Error(subscriptionTransitionError(transition));
  }

  return { request, plan, snapshotLimits, currentPeriod, transition };
}

async function createActivatedPeriod(
  tx: TransactionExecutor,
  context: Awaited<ReturnType<typeof getSubscriptionActivationContext>>,
  input: {
    now: Date;
    paymentMethod?: "mobile_money" | "carte" | "virement" | "especes" | "cheque";
    paymentReference?: string;
    validatedByAdminId?: string;
  },
) {
  const [processed] = await tx
    .update(subscriptionRequests)
    .set({
      statut: "validee",
      traiteeParAdminId: input.validatedByAdminId,
      traiteeAt: input.now,
    })
    .where(
      and(
        eq(subscriptionRequests.id, context.request.id),
        eq(subscriptionRequests.statut, "en_attente"),
      ),
    )
    .returning({ id: subscriptionRequests.id });
  if (!processed) throw new Error("Cette demande a déjà été traitée");

  if (context.currentPeriod) {
    await tx
      .update(subscriptionPeriods)
      .set(buildUpgradeClosure(input.now))
      .where(
        and(
          eq(subscriptionPeriods.id, context.currentPeriod.id),
          inArray(subscriptionPeriods.statut, ["active", "suspendue"]),
        ),
      );
  }

  const periodId = crypto.randomUUID();
  await tx.insert(subscriptionPeriods).values({
    id: periodId,
    partnerAccountId: context.request.partnerAccountId,
    requestId: context.request.id,
    planCode: context.request.planCode,
    tauxCommissionBpsFige: context.plan.tauxCommissionBps,
    prixPayeFcfa: context.request.prixFigeFcfa,
    moyenReglement: input.paymentMethod ?? null,
    referenceReglement: input.paymentReference ?? null,
    dateReglement: input.paymentMethod ? input.now : null,
    valideeParAdminId: input.validatedByAdminId,
    dateDebut: input.now,
    dateEcheance: addOneSubscriptionYear(input.now),
    statut: "active",
  });
  await tx.insert(subscriptionPeriodLimits).values(
    context.snapshotLimits.map((limit) => ({
      subscriptionPeriodId: periodId,
      activityType: limit.activityType,
      resourceType: limit.resourceType,
      maxCount: limit.maxCount,
    })),
  );
  return periodId;
}

export async function createPartnerSubscriptionRequest(
  input: PartnerSubscriptionRequestInput,
) {
  const parsed = partnerSubscriptionRequestSchema.parse(input);
  try {
    return await transactionalDb.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT id FROM ${partnerAccounts} WHERE id = ${parsed.partnerAccountId} FOR UPDATE`,
      );
      const partnerAccount = await tx.query.partnerAccounts.findFirst({
        where: eq(partnerAccounts.id, parsed.partnerAccountId),
      });
      if (!partnerAccount) throw new Error("Compte partenaire introuvable");

      if (partnerAccount.activityType === "restaurant") {
        const restaurant = await tx.query.restaurants.findFirst({
          where: eq(restaurants.partnerAccountId, parsed.partnerAccountId),
        });
        if (!restaurant?.actif || restaurant.suspendu) {
          throw new Error("Votre activité Restaurant est inactive ou suspendue");
        }
      }

      const pending = await tx.query.subscriptionRequests.findFirst({
        where: and(
          eq(subscriptionRequests.partnerAccountId, parsed.partnerAccountId),
          eq(subscriptionRequests.statut, "en_attente"),
        ),
      });
      if (pending) {
        throw new Error("Vous avez déjà une demande en cours de traitement");
      }

      const plan = await tx.query.subscriptionPlans.findFirst({
        where: eq(subscriptionPlans.code, parsed.planCode),
      });
      if (!plan?.actif) throw new Error("Offre non disponible");

      const now = new Date();
      const currentPeriod = await tx.query.subscriptionPeriods.findFirst({
        where: and(
          eq(subscriptionPeriods.partnerAccountId, parsed.partnerAccountId),
          inArray(subscriptionPeriods.statut, ["active", "suspendue"]),
          ne(subscriptionPeriods.planCode, "decouverte"),
          lte(subscriptionPeriods.dateDebut, now),
          gt(subscriptionPeriods.dateEcheance, now),
        ),
        orderBy: [desc(subscriptionPeriods.dateDebut)],
      });
      const currentPlan = currentPeriod
        ? await tx.query.subscriptionPlans.findFirst({
            where: eq(subscriptionPlans.code, currentPeriod.planCode),
          })
        : null;
      const transition = evaluateSubscriptionTransition(currentPlan ?? null, plan);
      if (!transition.allowed) {
        throw new Error(subscriptionTransitionError(transition));
      }

      const [request] = await tx
        .insert(subscriptionRequests)
        .values({
          partnerAccountId: parsed.partnerAccountId,
          planCode: plan.code,
          prixFigeFcfa: plan.prixAnnuelFcfa,
          statut: "en_attente",
        })
        .returning();
      if (!request) throw new Error("Création de la demande impossible");

      let paymentId: string | null = null;
      if (request.prixFigeFcfa > 0) {
        const transaction = await createTransactionInTransaction(tx, {
          type: "abonnement_partenaire",
          subscriptionRequestId: request.id,
          partnerAccountId: parsed.partnerAccountId,
          amountFcfa: request.prixFigeFcfa,
        });
        const payment = await createPaymentAttemptInTransaction(tx, {
          transactionId: transaction.id,
          amountFcfa: request.prixFigeFcfa,
          method: "mobile_money",
          provider: "paystack",
          providerReference: `toutci-subscription-${crypto.randomUUID()}`,
          idempotencyKey: `subscription-paystack:${request.id}:1`,
        });
        paymentId = payment.id;
      }
      return {
        requestId: request.id,
        paymentId,
        activityType: partnerAccount.activityType,
      };
    });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      throw new Error("Vous avez déjà une demande en cours de traitement");
    }
    throw error;
  }
}

export async function getResidenceSubscriptionBilling(
  partnerAccountId: string,
) {
  const parsedPartnerAccountId = partnerSubscriptionRequestSchema.shape.partnerAccountId.parse(
    partnerAccountId,
  );
  const account = await db.query.partnerAccounts.findFirst({
    where: eq(partnerAccounts.id, parsedPartnerAccountId),
    columns: { activityType: true },
  });
  if (account?.activityType !== "residence") {
    throw new Error("Compte partenaire Résidence introuvable");
  }

  const [effectivePlan, pendingRequest, plans] = await Promise.all([
    getEffectivePlan(parsedPartnerAccountId),
    db.query.subscriptionRequests.findFirst({
      where: and(
        eq(subscriptionRequests.partnerAccountId, parsedPartnerAccountId),
        eq(subscriptionRequests.statut, "en_attente"),
      ),
      orderBy: desc(subscriptionRequests.createdAt),
    }),
    db.query.subscriptionPlans.findMany({
      where: eq(subscriptionPlans.actif, true),
      orderBy: (plan, { asc }) => [asc(plan.ordre)],
      with: {
        limits: {
          where: eq(subscriptionPlanLimits.activityType, "residence"),
        },
      },
    }),
  ]);
  return { effectivePlan, pendingRequest, plans };
}

export async function getEffectiveSubscriptionContext(
  partnerAccountId: string,
  options: { executor?: DbExecutor; now?: Date } = {},
) {
  const parsedPartnerAccountId =
    partnerSubscriptionRequestSchema.shape.partnerAccountId.parse(
      partnerAccountId,
    );
  const executor = options.executor ?? db;
  // L'exécuteur peut être une connexion transactionnelle node-postgres :
  // elle ne doit pas recevoir deux requêtes concurrentes.
  const account = await executor.query.partnerAccounts.findFirst({
    where: eq(partnerAccounts.id, parsedPartnerAccountId),
    columns: { activityType: true },
  });
  const effective = await getEffectivePlan(parsedPartnerAccountId, options);
  if (!account) throw new Error("Compte partenaire introuvable");

  return {
    partnerAccountId: parsedPartnerAccountId,
    activityType: account.activityType,
    plan: {
      id: effective.plan.id,
      code: effective.plan.code,
      rateBps:
        effective.period?.tauxCommissionBpsFige ??
        effective.plan.tauxCommissionBps,
    },
    period: effective.period
      ? {
          id: effective.period.id,
          planCode: effective.period.planCode,
        }
      : null,
  };
}

export async function validateOfflineSubscriptionRequest(
  adminId: string,
  input: ValidateOfflineSubscriptionRequestInput,
) {
  const parsed = validateOfflineSubscriptionRequestSchema.parse(input);
  return transactionalDb.transaction(async (tx) => {
    const now = new Date();
    const context = await getSubscriptionActivationContext(tx, {
      requestId: parsed.requestId,
      now,
    });
    const isPaidPlan = context.request.prixFigeFcfa > 0;
    if (isPaidPlan && (!parsed.paymentMethod || !parsed.paymentReference)) {
      throw new Error("Le moyen et la référence de règlement sont obligatoires");
    }

    let financialPayment: {
      payment: { id: string };
      confirmation: { transactionId: string; alreadyConfirmed: boolean };
    } | null = null;
    if (isPaidPlan) {
      const transaction = await getSubscriptionTransactionInTransaction(
        tx,
        context.request.id,
      );
      if (!transaction) {
        throw new Error("Transaction financière de l’abonnement introuvable");
      }
      financialPayment = await recordConfirmedOfflinePaymentInTransaction(tx, {
        transactionId: transaction.id,
        amountFcfa: context.request.prixFigeFcfa,
        method: mapOfflinePaymentMethod(parsed.paymentMethod!),
        provider: null,
        idempotencyKey: `abonnement-admin:${context.request.id}`,
        confirmedByAdminId: adminId,
        now,
      });
    }

    const periodId = await createActivatedPeriod(tx, context, {
      now,
      paymentMethod: parsed.paymentMethod,
      paymentReference: parsed.paymentReference,
      validatedByAdminId: adminId,
    });

    await persistAuditLog(tx, {
      adminId,
      action: "abonnement_valide",
      ressourceType: "partner_account",
      ressourceId: context.request.partnerAccountId,
      details: {
        requestId: context.request.id,
        planCode: context.request.planCode,
        activityType: context.request.partnerAccount.activityType,
        transition: context.transition.kind,
        previousPeriodId: context.currentPeriod?.id ?? null,
        periodId,
        transactionId: financialPayment?.confirmation.transactionId ?? null,
        paymentId: financialPayment?.payment.id ?? null,
        limitsSnapshot: context.snapshotLimits.map(
          ({ resourceType, maxCount }) => ({ resourceType, maxCount }),
        ),
      },
    });
    await persistNotification(tx, {
      userId: context.request.partnerAccount.userId,
      type: "abonnement_valide",
      titre: "Abonnement validé",
      message: `Votre demande pour l'offre ${context.plan.nom} a été acceptée.`,
      lienType: "abonnement",
    });

    return {
      success: true,
      activityType: context.request.partnerAccount.activityType,
      restaurantId: context.request.partnerAccount.restaurant?.id ?? null,
    };
  });
}

export async function activatePaidSubscriptionInTransaction(
  tx: TransactionExecutor,
  input: {
    requestId: string;
    providerReference: string;
    paymentMethod: "mobile_money" | "card";
    now?: Date;
  },
) {
  const now = input.now ?? new Date();
  const existing = await tx.query.subscriptionRequests.findFirst({
    where: eq(subscriptionRequests.id, input.requestId),
  });
  if (!existing) throw new Error("Demande d’abonnement introuvable");
  if (existing.statut === "validee") return { alreadyActivated: true };
  if (existing.statut !== "en_attente" || existing.prixFigeFcfa <= 0) {
    throw new Error("Demande d’abonnement non activable par paiement");
  }

  const context = await getSubscriptionActivationContext(tx, {
    requestId: input.requestId,
    now,
  });
  const periodId = await createActivatedPeriod(tx, context, {
    now,
    paymentMethod: input.paymentMethod === "card" ? "carte" : "mobile_money",
    paymentReference: input.providerReference,
  });
  return { alreadyActivated: false, periodId };
}

export async function updateSubscriptionCatalogue(
  adminId: string,
  planCode: string,
  input: UpdateSubscriptionCatalogueInput,
) {
  const parsedCode = subscriptionPlanCodeSchema.parse(planCode);
  const parsed = updateSubscriptionCatalogueSchema.parse(input);

  await transactionalDb.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT code FROM ${subscriptionPlans} WHERE code = ${parsedCode} FOR UPDATE`,
    );
    const previous = await tx.query.subscriptionPlans.findFirst({
      where: eq(subscriptionPlans.code, parsedCode),
      with: { limits: true },
    });
    if (!previous) throw new Error("Offre introuvable");

    const [updated] = await tx
      .update(subscriptionPlans)
      .set({
        nom: parsed.nom,
        description: parsed.description,
        prixAnnuelFcfa: parsed.prixAnnuelFcfa,
        tauxCommissionBps: parsed.tauxCommissionBps,
        ordre: parsed.ordre,
        actif: parsed.actif,
        updatedByAdminId: adminId,
        updatedAt: new Date(),
      })
      .where(eq(subscriptionPlans.code, parsedCode))
      .returning();
    if (!updated) throw new Error("Offre introuvable");

    if (parsed.restaurantLimits) {
      for (const [resourceType, maxCount] of Object.entries(
        parsed.restaurantLimits,
      ) as ["dish" | "category", number | null][]) {
        await tx
          .insert(subscriptionPlanLimits)
          .values({
            planId: previous.id,
            activityType: "restaurant",
            resourceType,
            maxCount,
          })
          .onConflictDoUpdate({
            target: [
              subscriptionPlanLimits.planId,
              subscriptionPlanLimits.activityType,
              subscriptionPlanLimits.resourceType,
            ],
            set: { maxCount, updatedAt: new Date() },
          });
      }
    }

    if (parsed.residenceLimits) {
      await tx
        .insert(subscriptionPlanLimits)
        .values({
          planId: previous.id,
          activityType: "residence",
          resourceType: "residence",
          maxCount: parsed.residenceLimits.residence,
        })
        .onConflictDoUpdate({
          target: [
            subscriptionPlanLimits.planId,
            subscriptionPlanLimits.activityType,
            subscriptionPlanLimits.resourceType,
          ],
          set: {
            maxCount: parsed.residenceLimits.residence,
            updatedAt: new Date(),
          },
        });
    }

    const newLimits = await tx.query.subscriptionPlanLimits.findMany({
      where: eq(subscriptionPlanLimits.planId, previous.id),
    });
    await persistAuditLog(tx, {
      adminId,
      action: "quota_catalogue_modifie",
      ressourceType: "systeme",
      ressourceId: parsedCode,
      details: {
        planCode: parsedCode,
        oldValues: { ...previous, limits: previous.limits },
        newValues: { ...updated, limits: newLimits },
      },
    });
  });
}

export type {
  PartnerSubscriptionRequestInput,
  SubscriptionCataloguePayload,
  UpdateSubscriptionCatalogueInput,
  ValidateOfflineSubscriptionRequestInput,
} from "./contracts";
export type { OfflineSubscriptionPaymentMethod } from "./model";
