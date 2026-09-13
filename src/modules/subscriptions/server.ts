import "server-only";

import { randomUUID } from "node:crypto";
import { and, desc, eq, gt, inArray, lte, ne, sql } from "drizzle-orm";
import { persistAuditLog } from "@/modules/audit/server";
import { batchRead, db } from "@/infrastructure/db";
import { withDatabaseReadRetry } from "@/infrastructure/db/read-retry";
import {
  partnerAccounts,
  financialJournalEntries,
  payments,
  restaurants,
  subscriptionPeriodLimits,
  subscriptionPeriods,
  subscriptionPlanLimits,
  subscriptionPlans,
  subscriptionRequests,
  users,
} from "@/infrastructure/db/schema";
import {
  transactionalDb,
  type DbExecutor,
  type TransactionExecutor,
} from "@/infrastructure/db/transaction";
import { persistNotification } from "@/modules/notifications/server";
import { persistBusinessEvent } from "@/modules/events/server";
import {
  getCommissionRateBps,
  getEffectivePlan,
  getPartnerAccountIdForRestaurant,
  getPublicSubscriptionPlans,
  SUBSCRIPTION_PLANS_CACHE_TAG,
  SubscriptionLimitError,
} from "./_internal/effective-plan";
import {
  addOneSubscriptionYear,
  buildReactivationDecision,
  buildUpgradeClosure,
  evaluateSubscriptionTransition,
  subscriptionTransitionError,
} from "./model";
import {
  cancelTransactionInTransaction,
  createPaymentAttemptInTransaction,
  createTransactionInTransaction,
  confirmPaymentInTransaction,
  getSubscriptionTransactionInTransaction,
} from "@/modules/transactions/server";
import { mapOfflinePaymentMethod } from "@/modules/transactions/model";
import type { FinancialActor } from "@/modules/transactions/contracts";
import {
  partnerSubscriptionRequestSchema,
  effectiveSubscriptionSummaryListSchema,
  subscriptionCataloguePayloadSchema,
  subscriptionCatalogueRevisionIdSchema,
  subscriptionPlanCodeSchema,
  updateSubscriptionCatalogueSchema,
  validateOfflineSubscriptionRequestSchema,
  type PartnerSubscriptionRequestInput,
  type EffectiveSubscriptionSummaryDTO,
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

export {
  getCommissionRateBps,
  getEffectivePlan,
  getPartnerAccountIdForRestaurant,
  getPublicSubscriptionPlans,
  SUBSCRIPTION_PLANS_CACHE_TAG,
  SubscriptionLimitError,
};

export function getAdminSubscriptionCatalogueWorkspace() {
  return getAdminSubscriptionCatalogueWorkspaceRecord();
}

export async function getAdminSubscriptionOperationsWorkspace(
  now = new Date(),
) {
  const startOfMonth = new Date(now);
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [pendingRequests, summaryRows, activeSubscribers, recentPeriods] =
    await withDatabaseReadRetry(() =>
      batchRead([
        db
          .select({
            id: subscriptionRequests.id,
            restaurantId: restaurants.id,
            partnerNom: sql<string>`COALESCE(${restaurants.nom}, ${users.nom})`,
            activityType: partnerAccounts.activityType,
            planCode: subscriptionRequests.planCode,
            planNom: subscriptionPlans.nom,
            prixFigeFcfa: subscriptionRequests.prixFigeFcfa,
            statut: subscriptionRequests.statut,
            createdAt: subscriptionRequests.createdAt,
          })
          .from(subscriptionRequests)
          .innerJoin(
            partnerAccounts,
            eq(subscriptionRequests.partnerAccountId, partnerAccounts.id),
          )
          .innerJoin(users, eq(partnerAccounts.userId, users.id))
          .leftJoin(
            restaurants,
            eq(partnerAccounts.id, restaurants.partnerAccountId),
          )
          .innerJoin(
            subscriptionPlans,
            eq(subscriptionRequests.planCode, subscriptionPlans.code),
          )
          .where(eq(subscriptionRequests.statut, "en_attente"))
          .orderBy(desc(subscriptionRequests.createdAt)),
        db
          .select({
            requestsThisMonth: sql<number>`(
              SELECT COUNT(*) FROM ${subscriptionRequests}
              WHERE ${subscriptionRequests.createdAt} >= ${startOfMonth}
            )`,
            recentDiscoveryReturns: sql<number>`(
              SELECT COUNT(*) FROM ${subscriptionPeriods}
              WHERE ${subscriptionPeriods.statut} = ${"expiree"}
                AND ${subscriptionPeriods.planCode} <> ${"decouverte"}
                AND ${subscriptionPeriods.endedAt} >= ${sevenDaysAgo}
            )`,
          })
          .from(sql`(SELECT 1) AS subscription_summary_source`),
        db
          .select({
            partnerAccountId: subscriptionPeriods.partnerAccountId,
            restaurantId: restaurants.id,
            partnerNom: sql<string>`COALESCE(${restaurants.nom}, ${users.nom})`,
            activityType: partnerAccounts.activityType,
            planCode: subscriptionPeriods.planCode,
            planNom: subscriptionPlans.nom,
            statut: subscriptionPeriods.statut,
            dateDebut: subscriptionPeriods.dateDebut,
            dateEcheance: subscriptionPeriods.dateEcheance,
            tauxCommissionBpsFige: subscriptionPeriods.tauxCommissionBpsFige,
          })
          .from(subscriptionPeriods)
          .innerJoin(
            partnerAccounts,
            eq(subscriptionPeriods.partnerAccountId, partnerAccounts.id),
          )
          .innerJoin(users, eq(partnerAccounts.userId, users.id))
          .leftJoin(
            restaurants,
            eq(partnerAccounts.id, restaurants.partnerAccountId),
          )
          .innerJoin(
            subscriptionPlans,
            eq(subscriptionPeriods.planCode, subscriptionPlans.code),
          )
          .where(
            and(
              inArray(subscriptionPeriods.statut, ["active", "suspendue"]),
              ne(subscriptionPeriods.planCode, "decouverte"),
              gt(subscriptionPeriods.dateEcheance, now),
            ),
          )
          .orderBy(desc(subscriptionPeriods.dateEcheance)),
        db
          .select({
            id: subscriptionPeriods.id,
            partnerNom: sql<string>`COALESCE(${restaurants.nom}, ${users.nom})`,
            activityType: partnerAccounts.activityType,
            planCode: subscriptionPeriods.planCode,
            planNom: subscriptionPlans.nom,
            statut: subscriptionPeriods.statut,
            dateDebut: subscriptionPeriods.dateDebut,
            dateEcheance: subscriptionPeriods.dateEcheance,
            prixPayeFcfa: subscriptionPeriods.prixPayeFcfa,
            endedAt: subscriptionPeriods.endedAt,
            endReason: subscriptionPeriods.endReason,
          })
          .from(subscriptionPeriods)
          .innerJoin(
            partnerAccounts,
            eq(subscriptionPeriods.partnerAccountId, partnerAccounts.id),
          )
          .innerJoin(users, eq(partnerAccounts.userId, users.id))
          .leftJoin(
            restaurants,
            eq(partnerAccounts.id, restaurants.partnerAccountId),
          )
          .innerJoin(
            subscriptionPlans,
            eq(subscriptionPeriods.planCode, subscriptionPlans.code),
          )
          .orderBy(desc(subscriptionPeriods.dateDebut))
          .limit(20),
      ]),
    );

  return {
    pendingRequests,
    summary: summaryRows[0] ?? {
      requestsThisMonth: 0,
      recentDiscoveryReturns: 0,
    },
    activeSubscribers,
    recentPeriods,
  };
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

export async function getRestaurantSubscriptionBilling(
  partnerAccountId: string,
) {
  const parsedPartnerAccountId =
    partnerSubscriptionRequestSchema.shape.partnerAccountId.parse(
      partnerAccountId,
    );
  const account = await db.query.partnerAccounts.findFirst({
    where: eq(partnerAccounts.id, parsedPartnerAccountId),
    columns: { activityType: true },
  });
  if (account?.activityType !== "restaurant") {
    throw new Error("Compte partenaire Restaurant introuvable");
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
          where: eq(subscriptionPlanLimits.activityType, "restaurant"),
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
      name: effective.plan.nom,
      rateBps:
        effective.period?.tauxCommissionBpsFige ??
        effective.plan.tauxCommissionBps,
    },
    period: effective.period
      ? {
          id: effective.period.id,
          planCode: effective.period.planCode,
          status: effective.period.statut,
          expiresAt: effective.period.dateEcheance?.toISOString() ?? null,
        }
      : null,
  };
}

export async function getEffectiveSubscriptionSummaries(
  partnerAccountIds: string[],
): Promise<EffectiveSubscriptionSummaryDTO[]> {
  const accountIds = effectiveSubscriptionSummaryListSchema.parse([
    ...new Set(partnerAccountIds),
  ]);
  if (accountIds.length === 0) return [];

  const now = new Date();
  const [plans, activePeriods] = await withDatabaseReadRetry(() =>
    batchRead([
      db
        .select({
          code: subscriptionPlans.code,
          name: subscriptionPlans.nom,
          rateBps: subscriptionPlans.tauxCommissionBps,
        })
        .from(subscriptionPlans),
      db
        .select({
          partnerAccountId: subscriptionPeriods.partnerAccountId,
          planCode: subscriptionPeriods.planCode,
          planName: subscriptionPlans.nom,
          status: subscriptionPeriods.statut,
          expiresAt: subscriptionPeriods.dateEcheance,
          rateBps: subscriptionPeriods.tauxCommissionBpsFige,
          startedAt: subscriptionPeriods.dateDebut,
        })
        .from(subscriptionPeriods)
        .innerJoin(
          subscriptionPlans,
          eq(subscriptionPlans.code, subscriptionPeriods.planCode),
        )
        .where(
          and(
            inArray(subscriptionPeriods.partnerAccountId, accountIds),
            eq(subscriptionPeriods.statut, "active"),
            ne(subscriptionPeriods.planCode, "decouverte"),
            lte(subscriptionPeriods.dateDebut, now),
            gt(subscriptionPeriods.dateEcheance, now),
          ),
        )
        .orderBy(desc(subscriptionPeriods.dateDebut)),
    ]),
  );

  const discovery = plans.find((plan) => plan.code === "decouverte");
  if (!discovery) {
    throw new Error("Catalogue des plans corrompu: plan 'decouverte' introuvable.");
  }
  const activeByAccount = new Map(
    activePeriods.map((period) => [period.partnerAccountId, period]),
  );

  return accountIds.map((partnerAccountId) => {
    const period = activeByAccount.get(partnerAccountId);
    return period
      ? {
          partnerAccountId,
          plan: {
            code: period.planCode,
            name: period.planName,
            rateBps: period.rateBps,
          },
          period: {
            status: period.status,
            expiresAt: period.expiresAt?.toISOString() ?? null,
          },
        }
      : {
          partnerAccountId,
          plan: {
            code: discovery.code,
            name: discovery.name,
            rateBps: discovery.rateBps,
          },
          period: null,
        };
  });
}

export async function validateOfflineSubscriptionRequest(
  adminId: string,
  input: ValidateOfflineSubscriptionRequestInput,
) {
  const parsed = validateOfflineSubscriptionRequestSchema.parse(input);
  return transactionalDb.transaction(async (tx) => {
    const now = new Date();
    const request = await tx.query.subscriptionRequests.findFirst({
      where: eq(subscriptionRequests.id, parsed.requestId),
      with: { partnerAccount: { with: { restaurant: true } } },
    });
    if (!request) throw new Error("Demande d’abonnement introuvable");

    const isPaidPlan = request.prixFigeFcfa > 0;
    if (isPaidPlan && (!parsed.paymentMethod || !parsed.paymentReference)) {
      throw new Error("Le moyen et la référence de règlement sont obligatoires");
    }

    if (isPaidPlan) {
      const transaction = await getSubscriptionTransactionInTransaction(
        tx,
        request.id,
      );
      if (!transaction) {
        throw new Error("Transaction financière de l’abonnement introuvable");
      }
      const idempotencyKey = `abonnement-admin:${request.id}`;
      const existingPayment = transaction.payments.find(
        (payment) => payment.idempotencyKey === idempotencyKey,
      );
      const payment =
        existingPayment ??
        (await createPaymentAttemptInTransaction(tx, {
          transactionId: transaction.id,
          amountFcfa: request.prixFigeFcfa,
          method: mapOfflinePaymentMethod(parsed.paymentMethod!),
          provider: null,
          recordedReference: parsed.paymentReference,
          idempotencyKey,
        }));
      return finalizeSubscriptionPaymentInTransaction(tx, {
        paymentId: payment.id,
        actor: { type: "admin", id: adminId },
        channel: "offline",
        now,
      });
    }

    if (request.statut === "validee") {
      const period = await tx.query.subscriptionPeriods.findFirst({
        where: eq(subscriptionPeriods.requestId, request.id),
      });
      if (!period) throw new Error("Période d’abonnement validée introuvable");
      return {
        success: true,
        alreadyFinalized: true,
        periodId: period.id,
        activityType: request.partnerAccount.activityType,
        restaurantId: request.partnerAccount.restaurant?.id ?? null,
      };
    }

    const context = await getSubscriptionActivationContext(tx, {
      requestId: request.id,
      now,
    });
    const periodId = await createActivatedPeriod(tx, context, {
      now,
      validatedByAdminId: adminId,
    });
    const eventId = randomUUID();
    const correlationId = randomUUID();
    const auditDetails = {
      requestId: context.request.id,
      planCode: context.request.planCode,
      activityType: context.request.partnerAccount.activityType,
      transition: context.transition.kind,
      previousPeriodId: context.currentPeriod?.id ?? null,
      periodId,
      freePlan: true,
      limitsSnapshot: context.snapshotLimits.map(
        ({ resourceType, maxCount }) => ({ resourceType, maxCount }),
      ),
    };
    await persistBusinessEvent(tx, {
      eventId,
      correlationId,
      type: "subscription.request.activated.v1",
      actor: { type: "admin", id: adminId },
      partnerAccountId: context.request.partnerAccountId,
      target: { type: "subscription_period", id: periodId },
      occurredAt: now,
      payload: auditDetails,
      effects: [
        {
          type: "audit.project",
          payload: { action: "abonnement_valide", details: auditDetails },
        },
        {
          type: "notification.project",
          payload: {
            items: [
              {
                recipient: {
                  type: "user",
                  id: context.request.partnerAccount.userId,
                },
                template: "subscription_activated",
                destination: { type: "abonnement", id: periodId },
              },
            ],
          },
        },
      ],
    });
    await persistNotification(tx, {
      userId: context.request.partnerAccount.userId,
      type: "abonnement_valide",
      titre: "Abonnement validé",
      message: `Votre demande pour l'offre ${context.plan.nom} a été acceptée.`,
      lienType: "abonnement",
      lienId: periodId,
      eventId,
      correlationId,
    });

    return {
      success: true,
      alreadyFinalized: false,
      periodId,
      activityType: context.request.partnerAccount.activityType,
      restaurantId: context.request.partnerAccount.restaurant?.id ?? null,
    };
  });
}

function toSubscriptionPaymentMethod(
  method: "cash" | "mobile_money" | "card" | "bank_transfer" | "cheque" | "manual",
) {
  switch (method) {
    case "mobile_money":
      return "mobile_money" as const;
    case "card":
      return "carte" as const;
    case "bank_transfer":
      return "virement" as const;
    case "cash":
      return "especes" as const;
    case "cheque":
      return "cheque" as const;
    case "manual":
      throw new Error("Le moyen manuel générique ne peut pas activer un abonnement");
  }
}

export async function finalizeSubscriptionPaymentInTransaction(
  tx: TransactionExecutor,
  input: {
    paymentId: string;
    actor: FinancialActor;
    channel: "provider" | "offline";
    now?: Date;
  },
) {
  const now = input.now ?? new Date();
  const payment = await tx.query.payments.findFirst({
    where: eq(payments.id, input.paymentId),
    with: {
      transaction: {
        with: {
          subscriptionRequest: {
            with: { partnerAccount: { with: { user: true, restaurant: true } } },
          },
        },
      },
    },
  });
  if (
    !payment ||
    payment.transaction.type !== "abonnement_partenaire" ||
    !payment.transaction.subscriptionRequest
  ) {
    throw new Error("Paiement d’abonnement introuvable");
  }
  const request = payment.transaction.subscriptionRequest;
  if (request.prixFigeFcfa <= 0) {
    throw new Error("Demande d’abonnement non activable par paiement");
  }
  if (
    (input.channel === "provider" && !payment.provider) ||
    (input.channel === "offline" && payment.provider)
  ) {
    throw new Error("Le canal ne correspond pas à la tentative de paiement");
  }

  if (request.statut === "validee") {
    const period = await tx.query.subscriptionPeriods.findFirst({
      where: eq(subscriptionPeriods.requestId, request.id),
    });
    if (
      !period ||
      payment.status !== "confirmed" ||
      payment.transaction.status !== "paid"
    ) {
      throw new Error("État financier d’abonnement incohérent");
    }
    return {
      success: true,
      alreadyFinalized: true,
      periodId: period.id,
      activityType: request.partnerAccount.activityType,
      restaurantId: request.partnerAccount.restaurant?.id ?? null,
    };
  }
  if (request.statut !== "en_attente") {
    throw new Error("Demande d’abonnement non activable par paiement");
  }

  const context = await getSubscriptionActivationContext(tx, {
    requestId: request.id,
    now,
  });
  const confirmation = await confirmPaymentInTransaction(tx, {
    paymentId: payment.id,
    confirmedByAdminId: input.actor.type === "admin" ? input.actor.id : null,
    now,
  });
  const periodId = await createActivatedPeriod(tx, context, {
    now,
    paymentMethod: toSubscriptionPaymentMethod(payment.method),
    paymentReference:
      payment.providerReference ?? payment.recordedReference ?? undefined,
    validatedByAdminId: input.actor.type === "admin" ? input.actor.id : undefined,
  });
  const eventId = randomUUID();
  const correlationId = randomUUID();
  const auditDetails = {
    requestId: request.id,
    planCode: request.planCode,
    activityType: request.partnerAccount.activityType,
    transition: context.transition.kind,
    previousPeriodId: context.currentPeriod?.id ?? null,
    periodId,
    transactionId: confirmation.transactionId,
    paymentId: payment.id,
    channel: input.channel,
    amountFcfa: payment.amountFcfa,
    currency: payment.transaction.currency,
    provider: payment.provider,
    paymentMethod: payment.method,
    limitsSnapshot: context.snapshotLimits.map(({ resourceType, maxCount }) => ({
      resourceType,
      maxCount,
    })),
  };
  await persistBusinessEvent(tx, {
    eventId,
    correlationId,
    type: "subscription.payment.finalized.v1",
    actor: input.actor,
    partnerAccountId: request.partnerAccountId,
    target: { type: "subscription_period", id: periodId },
    occurredAt: now,
    payload: auditDetails,
    effects: [
      {
        type: "audit.project",
        payload: { action: "abonnement_valide", details: auditDetails },
      },
      {
        type: "notification.project",
        payload: {
          items: [
            {
              recipient: { type: "user", id: request.partnerAccount.userId },
              template: "subscription_activated",
              destination: { type: "abonnement", id: periodId },
            },
          ],
        },
      },
    ],
  });
  await tx.insert(financialJournalEntries).values({
    transactionId: payment.transactionId,
    paymentId: payment.id,
    partnerAccountId: request.partnerAccountId,
    subscriptionPeriodId: periodId,
    eventId,
    entryType: "payment_confirmed",
    direction: "inflow",
    channel: input.channel,
    amountFcfa: payment.amountFcfa,
    currency: "XOF",
    provider: payment.provider,
    method: payment.method,
    reference: payment.providerReference ?? payment.recordedReference,
    actorType: input.actor.type,
    actorId: input.actor.id,
    occurredAt: now,
  });
  await persistNotification(tx, {
    userId: request.partnerAccount.userId,
    type: "abonnement_valide",
    titre: "Abonnement validé",
    message: `Votre demande pour l'offre ${context.plan.nom} a été acceptée.`,
    lienType: "abonnement",
    lienId: periodId,
    eventId,
    correlationId,
  });
  return {
    success: true,
    alreadyFinalized: false,
    periodId,
    activityType: request.partnerAccount.activityType,
    restaurantId: request.partnerAccount.restaurant?.id ?? null,
  };
}

function normalizeLifecycleReason(reason: string) {
  const normalized = reason.trim();
  if (normalized.length < 5 || normalized.length > 1_000) {
    throw new Error("Le motif doit contenir entre 5 et 1000 caractères");
  }
  return normalized;
}

export async function rejectPartnerSubscriptionRequest(
  adminId: string,
  input: { requestId: string; reason: string },
) {
  const reason = normalizeLifecycleReason(input.reason);
  return transactionalDb.transaction(async (tx) => {
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
    const now = new Date();
    const [processed] = await tx
      .update(subscriptionRequests)
      .set({
        statut: "refusee",
        motifRefus: reason,
        traiteeParAdminId: adminId,
        traiteeAt: now,
      })
      .where(
        and(
          eq(subscriptionRequests.id, request.id),
          eq(subscriptionRequests.statut, "en_attente"),
        ),
      )
      .returning({ id: subscriptionRequests.id });
    if (!processed) throw new Error("Cette demande a déjà été traitée");

    let transactionId: string | null = null;
    if (request.prixFigeFcfa > 0) {
      const transaction = await getSubscriptionTransactionInTransaction(
        tx,
        request.id,
      );
      if (!transaction) {
        throw new Error("Transaction financière de l’abonnement introuvable");
      }
      await cancelTransactionInTransaction(tx, transaction.id, now);
      transactionId = transaction.id;
    }

    const eventId = randomUUID();
    const correlationId = randomUUID();
    const details = {
      requestId: request.id,
      planCode: request.planCode,
      activityType: request.partnerAccount.activityType,
      transactionId,
      decision: "rejected",
    };
    await persistBusinessEvent(tx, {
      eventId,
      correlationId,
      type: "subscription.request.rejected.v1",
      actor: { type: "admin", id: adminId },
      partnerAccountId: request.partnerAccountId,
      target: { type: "subscription_request", id: request.id },
      occurredAt: now,
      payload: details,
      effects: [
        {
          type: "audit.project",
          payload: { action: "abonnement_refuse", details },
        },
        {
          type: "notification.project",
          payload: {
            items: [
              {
                recipient: { type: "user", id: request.partnerAccount.userId },
                template: "subscription_rejected",
                destination: { type: "abonnement", id: request.id },
              },
            ],
          },
        },
      ],
    });
    await persistNotification(tx, {
      userId: request.partnerAccount.userId,
      type: "abonnement_refuse",
      titre: "Abonnement refusé",
      message: `Votre demande d'abonnement a été refusée : ${reason}`,
      lienType: "abonnement",
      lienId: request.id,
      eventId,
      correlationId,
    });
    return {
      success: true,
      restaurantId: request.partnerAccount.restaurant?.id ?? null,
    };
  });
}

export async function suspendPartnerSubscription(
  adminId: string,
  input: { partnerAccountId: string; reason: string },
) {
  const reason = normalizeLifecycleReason(input.reason);
  return transactionalDb.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT id FROM ${partnerAccounts} WHERE id = ${input.partnerAccountId} FOR UPDATE`,
    );
    const now = new Date();
    const period = await tx.query.subscriptionPeriods.findFirst({
      where: and(
        eq(subscriptionPeriods.partnerAccountId, input.partnerAccountId),
        eq(subscriptionPeriods.statut, "active"),
        ne(subscriptionPeriods.planCode, "decouverte"),
        gt(subscriptionPeriods.dateEcheance, now),
      ),
      with: { partnerAccount: { with: { user: true, restaurant: true } } },
    });
    if (!period) throw new Error("Aucun abonnement actif pour ce partenaire");

    const [updated] = await tx
      .update(subscriptionPeriods)
      .set({
        statut: "suspendue",
        motifSuspension: reason,
        suspenduParAdminId: adminId,
        suspenduAt: now,
      })
      .where(
        and(
          eq(subscriptionPeriods.id, period.id),
          eq(subscriptionPeriods.statut, "active"),
        ),
      )
      .returning({ id: subscriptionPeriods.id });
    if (!updated) throw new Error("Cet abonnement a déjà été traité");

    const eventId = randomUUID();
    const correlationId = randomUUID();
    const details = {
      periodId: period.id,
      planCode: period.planCode,
      lifecycle: "suspended",
    };
    await persistBusinessEvent(tx, {
      eventId,
      correlationId,
      type: "subscription.period.suspended.v1",
      actor: { type: "admin", id: adminId },
      partnerAccountId: input.partnerAccountId,
      target: { type: "subscription_period", id: period.id },
      occurredAt: now,
      payload: details,
      effects: [
        {
          type: "audit.project",
          payload: { action: "abonnement_suspendu", details },
        },
        {
          type: "notification.project",
          payload: {
            items: [
              {
                recipient: { type: "user", id: period.partnerAccount.userId },
                template: "subscription_suspended",
                destination: { type: "abonnement", id: period.id },
              },
            ],
          },
        },
      ],
    });
    await persistNotification(tx, {
      userId: period.partnerAccount.userId,
      type: "abonnement_suspendu",
      titre: "Abonnement suspendu",
      message: `Votre abonnement a été suspendu. Motif : ${reason}`,
      lienType: "abonnement",
      lienId: period.id,
      eventId,
      correlationId,
    });
    return { restaurantId: period.partnerAccount.restaurant?.id ?? null };
  });
}

async function expireSubscriptionPeriodInTransaction(
  tx: TransactionExecutor,
  input: {
    periodId: string;
    partnerAccountId: string;
    planCode: string;
    dateEcheance: Date;
    userId: string;
    now: Date;
  },
) {
  const [expired] = await tx
    .update(subscriptionPeriods)
    .set({
      statut: "expiree",
      endedAt: input.dateEcheance,
      endReason: "expiration_naturelle",
    })
    .where(
      and(
        eq(subscriptionPeriods.id, input.periodId),
        inArray(subscriptionPeriods.statut, ["active", "suspendue"]),
        lte(subscriptionPeriods.dateEcheance, input.now),
      ),
    )
    .returning({ id: subscriptionPeriods.id });
  if (!expired) return false;

  const eventId = randomUUID();
  const correlationId = randomUUID();
  const details = {
    periodId: input.periodId,
    planCode: input.planCode,
    lifecycle: "expired",
    cause: "expiration_naturelle",
  };
  await persistBusinessEvent(tx, {
    eventId,
    correlationId,
    type: "subscription.period.expired.v1",
    actor: { type: "system", id: "toutci:subscription-lifecycle" },
    partnerAccountId: input.partnerAccountId,
    target: { type: "subscription_period", id: input.periodId },
    occurredAt: input.now,
    payload: details,
    effects: [
      {
        type: "audit.project",
        payload: { action: "abonnement_expire", details },
      },
      {
        type: "notification.project",
        payload: {
          items: [
            {
              recipient: { type: "user", id: input.userId },
              template: "subscription_expired",
              destination: { type: "abonnement", id: input.periodId },
            },
          ],
        },
      },
    ],
  });
  await persistNotification(tx, {
    userId: input.userId,
    type: "abonnement_expire",
    titre: "Abonnement expiré",
    message: `Votre abonnement ${input.planCode} a expiré. L'offre Découverte s'applique désormais automatiquement.`,
    lienType: "abonnement",
    lienId: input.periodId,
    eventId,
    correlationId,
  });
  return true;
}

export async function reactivatePartnerSubscription(
  adminId: string,
  partnerAccountId: string,
) {
  return transactionalDb.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT id FROM ${partnerAccounts} WHERE id = ${partnerAccountId} FOR UPDATE`,
    );
    const period = await tx.query.subscriptionPeriods.findFirst({
      where: and(
        eq(subscriptionPeriods.partnerAccountId, partnerAccountId),
        eq(subscriptionPeriods.statut, "suspendue"),
      ),
      orderBy: (periods, { desc: descending }) => [
        descending(periods.suspenduAt),
      ],
      with: { partnerAccount: { with: { user: true, restaurant: true } } },
    });
    if (!period) throw new Error("Aucun abonnement suspendu pour ce partenaire");
    if (!period.dateEcheance) {
      throw new Error("Cette période payante ne possède pas d’échéance valide");
    }
    const now = new Date();
    const decision = buildReactivationDecision(period.dateEcheance, now);
    if (!decision.reactivated) {
      await expireSubscriptionPeriodInTransaction(tx, {
        periodId: period.id,
        partnerAccountId,
        planCode: period.planCode,
        dateEcheance: period.dateEcheance,
        userId: period.partnerAccount.userId,
        now,
      });
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

    const eventId = randomUUID();
    const correlationId = randomUUID();
    const details = {
      periodId: period.id,
      planCode: period.planCode,
      lifecycle: "reactivated",
    };
    await persistBusinessEvent(tx, {
      eventId,
      correlationId,
      type: "subscription.period.reactivated.v1",
      actor: { type: "admin", id: adminId },
      partnerAccountId,
      target: { type: "subscription_period", id: period.id },
      occurredAt: now,
      payload: details,
      effects: [
        {
          type: "audit.project",
          payload: { action: "abonnement_reactive", details },
        },
        {
          type: "notification.project",
          payload: {
            items: [
              {
                recipient: { type: "user", id: period.partnerAccount.userId },
                template: "subscription_reactivated",
                destination: { type: "abonnement", id: period.id },
              },
            ],
          },
        },
      ],
    });
    await persistNotification(tx, {
      userId: period.partnerAccount.userId,
      type: "systeme",
      titre: "Abonnement réactivé",
      message: "Votre abonnement Toutci a été réactivé.",
      lienType: "abonnement",
      lienId: period.id,
      eventId,
      correlationId,
    });
    return {
      reactivated: true as const,
      restaurantId: period.partnerAccount.restaurant?.id ?? null,
    };
  });
}

export async function expireDueSubscriptions(now = new Date()) {
  const duePeriods = await db.query.subscriptionPeriods.findMany({
    where: and(
      inArray(subscriptionPeriods.statut, ["active", "suspendue"]),
      ne(subscriptionPeriods.planCode, "decouverte"),
      lte(subscriptionPeriods.dateEcheance, now),
    ),
    with: { partnerAccount: true },
  });
  let expired = 0;
  for (const period of duePeriods) {
    if (!period.dateEcheance) continue;
    const processed = await transactionalDb.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT id FROM ${partnerAccounts} WHERE id = ${period.partnerAccountId} FOR UPDATE`,
      );
      return expireSubscriptionPeriodInTransaction(tx, {
        periodId: period.id,
        partnerAccountId: period.partnerAccountId,
        planCode: period.planCode,
        dateEcheance: period.dateEcheance!,
        userId: period.partnerAccount.userId,
        now,
      });
    });
    if (processed) expired += 1;
  }
  return { processed: duePeriods.length, expired };
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
