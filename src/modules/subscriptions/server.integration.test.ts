import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { and, eq, inArray } from "drizzle-orm";

vi.mock("server-only", () => ({}));

const runDevDatabaseIntegration =
  process.env.RUN_DEV_DB_SUBSCRIPTION_INTEGRATION === "1";
const integration = runDevDatabaseIntegration ? describe : describe.skip;

integration("abonnement d'un compte partenaire Résidence (base de développement)", () => {
  const partnerUserId = crypto.randomUUID();
  const adminUserId = crypto.randomUUID();
  const emailSuffix = crypto.randomUUID();
  let partnerAccountId: string;
  let requestId: string;

  beforeAll(async () => {
    const { transactionalDb } = await import("@/infrastructure/db/transaction");
    const { partnerAccounts, users } = await import("@/infrastructure/db/schema");
    partnerAccountId = await transactionalDb.transaction(async (tx) => {
      await tx.insert(users).values([
        {
          id: partnerUserId,
          email: `integration-residence-${emailSuffix}@toutci.test`,
          password: "integration-only-not-a-real-password",
          role: "partner",
          nom: "Résidence intégration 2B",
          telephone: "+2250000000001",
          emailVerifie: true,
        },
        {
          id: adminUserId,
          email: `integration-admin-${emailSuffix}@toutci.test`,
          password: "integration-only-not-a-real-password",
          role: "admin",
          nom: "Admin intégration 2B",
          telephone: "+2250000000002",
          emailVerifie: true,
        },
      ]);
      const [account] = await tx
        .insert(partnerAccounts)
        .values({ userId: partnerUserId, activityType: "residence" })
        .returning({ id: partnerAccounts.id });
      if (!account) throw new Error("Fixture Partner Account non créée");
      return account.id;
    });
  }, 30_000);

  afterAll(async () => {
    if (!partnerAccountId) return;
    const { transactionalDb } = await import("@/infrastructure/db/transaction");
    const {
      auditLog,
      financialTransactions,
      notifications,
      partnerAccounts,
      payments,
      subscriptionPeriodLimits,
      subscriptionPeriods,
      subscriptionRequests,
      users,
    } = await import("@/infrastructure/db/schema");
    await transactionalDb.transaction(async (tx) => {
      const transactions = await tx.query.financialTransactions.findMany({
        where: eq(financialTransactions.partnerAccountId, partnerAccountId),
        columns: { id: true },
      });
      const transactionIds = transactions.map((transaction) => transaction.id);
      const periods = await tx.query.subscriptionPeriods.findMany({
        where: eq(subscriptionPeriods.partnerAccountId, partnerAccountId),
        columns: { id: true },
      });
      const periodIds = periods.map((period) => period.id);

      await tx.delete(auditLog).where(
        and(
          eq(auditLog.ressourceType, "partner_account"),
          eq(auditLog.ressourceId, partnerAccountId),
        ),
      );
      await tx.delete(notifications).where(eq(notifications.userId, partnerUserId));
      if (periodIds.length > 0) {
        await tx
          .delete(subscriptionPeriodLimits)
          .where(inArray(subscriptionPeriodLimits.subscriptionPeriodId, periodIds));
      }
      await tx
        .delete(subscriptionPeriods)
        .where(eq(subscriptionPeriods.partnerAccountId, partnerAccountId));
      if (transactionIds.length > 0) {
        await tx.delete(payments).where(inArray(payments.transactionId, transactionIds));
      }
      await tx
        .delete(financialTransactions)
        .where(eq(financialTransactions.partnerAccountId, partnerAccountId));
      await tx
        .delete(subscriptionRequests)
        .where(eq(subscriptionRequests.partnerAccountId, partnerAccountId));
      await tx.delete(partnerAccounts).where(eq(partnerAccounts.id, partnerAccountId));
      await tx.delete(users).where(inArray(users.id, [partnerUserId, adminUserId]));
    });
  }, 30_000);

  it("crée, paie et active Croissance avec le snapshot Résidence", async () => {
    const {
      createPartnerSubscriptionRequest,
      validateOfflineSubscriptionRequest,
    } = await import("./server");
    const { transactionalDb } = await import("@/infrastructure/db/transaction");
    const {
      subscriptionPeriods,
      subscriptionRequests,
    } = await import("@/infrastructure/db/schema");

    const prepared = await createPartnerSubscriptionRequest({
      partnerAccountId,
      planCode: "croissance",
    });
    requestId = prepared.requestId;
    expect(prepared.activityType).toBe("residence");
    expect(prepared.paymentId).toBeTruthy();

    const activated = await validateOfflineSubscriptionRequest(adminUserId, {
      requestId,
      paymentMethod: "virement",
      paymentReference: `VIR-2B-${emailSuffix}`,
    });
    expect(activated.activityType).toBe("residence");
    expect(activated.restaurantId).toBeNull();

    const state = await transactionalDb.transaction(async (tx) => {
      const request = await tx.query.subscriptionRequests.findFirst({
        where: eq(subscriptionRequests.id, requestId),
      });
      const period = await tx.query.subscriptionPeriods.findFirst({
        where: eq(subscriptionPeriods.partnerAccountId, partnerAccountId),
        with: { limits: true },
      });
      return { request, period };
    });
    expect(state.request?.statut).toBe("validee");
    expect(state.period?.planCode).toBe("croissance");
    expect(state.period?.prixPayeFcfa).toBeGreaterThan(0);
    expect(state.period?.limits).toEqual([
      expect.objectContaining({
        activityType: "residence",
        resourceType: "residence",
        maxCount: 5,
      }),
    ]);
    expect(
      state.period?.limits.some(
        (limit) =>
          limit.activityType === "restaurant" ||
          limit.resourceType === "dish" ||
          limit.resourceType === "category",
      ),
    ).toBe(false);
  }, 30_000);
});
