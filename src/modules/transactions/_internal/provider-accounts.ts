import "server-only";

import { randomUUID } from "node:crypto";
import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "@/infrastructure/db";
import { paymentProviderAccounts, residences, restaurants } from "@/infrastructure/db/schema";
import { transactionalDb } from "@/infrastructure/db/transaction";
import { persistAuditLog } from "@/modules/audit/server";
import { persistBusinessEvent } from "@/modules/events/server";
import {
  PaystackGateway,
  PaystackGatewayError,
} from "@/infrastructure/paystack/gateway";
import type {
  ConfigurePayoutDestinationInput,
  PayoutDestinationDTO,
  PayoutGateway,
} from "../contracts";
import { configurePayoutDestinationSchema } from "../contracts";
import {
  normalizePayoutAccountIdentifier,
  PayoutDestinationError,
} from "../model";

type ProviderAccountRecord = typeof paymentProviderAccounts.$inferSelect;

function toPayoutDestinationDTO(
  account: ProviderAccountRecord,
): PayoutDestinationDTO {
  return {
    status: account.status,
    type: account.destinationType,
    environment: account.providerEnvironment,
    providerVerified: account.providerVerified,
    institutionCode: account.settlementInstitutionCode,
    institutionName: account.settlementInstitutionName,
    maskedIdentifier: account.accountIdentifierLast4
      ? `•••• ${account.accountIdentifierLast4}`
      : null,
    verifiedAt: account.verifiedAt?.toISOString() ?? null,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  };
}

function ensureProviderAccountUsable(account: {
  active: boolean;
  currency: string | null;
}) {
  if (!account.active || (account.currency && account.currency !== "XOF")) {
    throw new PayoutDestinationError(
      "PROVIDER_REJECTED",
      "Paystack n’a pas activé cette destination pour les versements en XOF.",
    );
  }
}

function providerStatus(account: {
  environment: "test" | "live";
  verified: boolean;
}) {
  return account.environment === "test" || account.verified
    ? ("active" as const)
    : ("pending" as const);
}

function throwPayoutProviderError(error: unknown): never {
  if (error instanceof PayoutDestinationError) throw error;
  if (error instanceof PaystackGatewayError) {
    throw new PayoutDestinationError(
      error.definitive ? "PROVIDER_REJECTED" : "PROVIDER_UNAVAILABLE",
      error.definitive
        ? "Paystack n’a pas reconnu cette destination. Vérifiez l’établissement et le numéro saisis."
        : "Paystack est momentanément indisponible. Réessayez plus tard.",
    );
  }
  throw error;
}

export async function getPaystackProviderAccount(partnerAccountId: string) {
  return db.query.paymentProviderAccounts.findFirst({
    where: and(
      eq(paymentProviderAccounts.partnerAccountId, partnerAccountId),
      eq(paymentProviderAccounts.provider, "paystack"),
    ),
  });
}

export async function getPartnerPayoutDestination(partnerAccountId: string) {
  const account = await getPaystackProviderAccount(partnerAccountId);
  return account ? toPayoutDestinationDTO(account) : null;
}

export async function listPaystackPayoutInstitutions(
  gateway: PayoutGateway = new PaystackGateway(),
) {
  return gateway.listInstitutions("XOF");
}

export async function configurePartnerPayoutDestination(
  input: ConfigurePayoutDestinationInput & {
    partnerAccountId: string;
    userId: string;
    businessName: string;
  },
  gateway: PayoutGateway = new PaystackGateway(),
) {
  const parsed = configurePayoutDestinationSchema.parse({
    institutionCode: input.institutionCode,
    accountIdentifier: input.accountIdentifier,
  });
  const institutions = await gateway.listInstitutions("XOF");
  const institution = institutions.find(
    (candidate) => candidate.code === parsed.institutionCode,
  );
  if (!institution) {
    throw new PayoutDestinationError(
      "INSTITUTION_UNAVAILABLE",
      "Cet établissement n’est pas disponible pour les versements XOF.",
    );
  }
  const accountIdentifier = normalizePayoutAccountIdentifier({
    value: parsed.accountIdentifier,
    type: institution.type,
  });
  const last4 = accountIdentifier.slice(-4);

  return transactionalDb.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${input.partnerAccountId}))`);
    const current = await tx.query.paymentProviderAccounts.findFirst({
      where: and(
        eq(paymentProviderAccounts.partnerAccountId, input.partnerAccountId),
        eq(paymentProviderAccounts.provider, "paystack"),
      ),
    });
    if (current && current.status !== "disabled") {
      if (
        current.settlementInstitutionCode === institution.code &&
        current.accountIdentifierLast4 === last4
      ) {
        return toPayoutDestinationDTO(current);
      }
      throw new PayoutDestinationError(
        "ACCOUNT_ALREADY_CONFIGURED",
        "Une destination de versement existe déjà. Contactez le support pour la remplacer.",
      );
    }

    let providerAccount: Awaited<
      ReturnType<PayoutGateway["createSubaccount"]>
    >;
    try {
      providerAccount = await gateway.createSubaccount({
        businessName: input.businessName,
        institutionCode: institution.code,
        accountIdentifier,
        percentageCharge: 0,
      });
    } catch (error) {
      throwPayoutProviderError(error);
    }
    ensureProviderAccountUsable(providerAccount);

    const now = new Date();
    const status = providerStatus(providerAccount);
    const values = {
      providerAccountReference: providerAccount.reference,
      status,
      destinationType: institution.type,
      providerEnvironment: providerAccount.environment,
      providerVerified: providerAccount.verified,
      settlementInstitutionCode: institution.code,
      settlementInstitutionName: institution.name,
      accountIdentifierLast4: last4,
      verifiedAt: providerAccount.verified ? now : null,
      linkedByAdminId: null,
      linkedByUserId: input.userId,
      disabledAt: null,
      updatedAt: now,
    } as const;
    const [account] = current
      ? await tx
          .update(paymentProviderAccounts)
          .set(values)
          .where(eq(paymentProviderAccounts.id, current.id))
          .returning()
      : await tx
          .insert(paymentProviderAccounts)
          .values({
            ...values,
            partnerAccountId: input.partnerAccountId,
            provider: "paystack",
          })
          .returning();
    if (!account) {
      throw new PayoutDestinationError(
        "PROVIDER_UNAVAILABLE",
        "La destination de versement n’a pas pu être enregistrée.",
      );
    }

    await persistBusinessEvent(tx, {
      eventId: randomUUID(),
      correlationId: randomUUID(),
      type: "finance.payoutdestination.provisioned.v1",
      actor: { type: "partner", id: input.userId },
      partnerAccountId: input.partnerAccountId,
      target: { type: "payment_provider_account", id: account.id },
      occurredAt: now,
      payload: {
        destinationType: institution.type,
        institutionCode: institution.code,
        providerEnvironment: providerAccount.environment,
        providerVerified: providerAccount.verified,
        status,
      },
      effects: [{
        type: "audit.project",
        payload: {
          action: "provider_account_associe",
          details: {
            destinationType: institution.type,
            institutionCode: institution.code,
            providerEnvironment: providerAccount.environment,
            providerVerified: providerAccount.verified,
            status,
          },
        },
      }],
    });
    return toPayoutDestinationDTO(account);
  });
}

export async function refreshPartnerPayoutDestination(
  input: { partnerAccountId: string; userId: string },
  gateway: PayoutGateway = new PaystackGateway(),
) {
  return transactionalDb.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${input.partnerAccountId}))`);
    const current = await tx.query.paymentProviderAccounts.findFirst({
      where: and(
        eq(paymentProviderAccounts.partnerAccountId, input.partnerAccountId),
        eq(paymentProviderAccounts.provider, "paystack"),
      ),
    });
    if (!current || current.status === "disabled") {
      throw new PayoutDestinationError(
        "DESTINATION_INVALID",
        "Aucune destination de versement à vérifier.",
      );
    }
    if (current.status === "active") return toPayoutDestinationDTO(current);

    let providerAccount: Awaited<
      ReturnType<PayoutGateway["getSubaccount"]>
    >;
    try {
      providerAccount = await gateway.getSubaccount(
        current.providerAccountReference,
      );
    } catch (error) {
      throwPayoutProviderError(error);
    }
    ensureProviderAccountUsable(providerAccount);
    const nextStatus = providerStatus(providerAccount);
    if (
      nextStatus === current.status &&
      providerAccount.verified === current.providerVerified
    ) {
      return toPayoutDestinationDTO(current);
    }
    const now = new Date();
    const [account] = await tx
      .update(paymentProviderAccounts)
      .set({
        status: nextStatus,
        providerVerified: providerAccount.verified,
        verifiedAt: providerAccount.verified ? now : null,
        updatedAt: now,
      })
      .where(eq(paymentProviderAccounts.id, current.id))
      .returning();
    if (!account) {
      throw new PayoutDestinationError(
        "PROVIDER_UNAVAILABLE",
        "La vérification Paystack n’a pas pu être enregistrée.",
      );
    }
    await persistBusinessEvent(tx, {
      eventId: randomUUID(),
      correlationId: randomUUID(),
      type: "finance.payoutdestination.verified.v1",
      actor: { type: "partner", id: input.userId },
      partnerAccountId: input.partnerAccountId,
      target: { type: "payment_provider_account", id: account.id },
      occurredAt: now,
      payload: {
        destinationType: account.destinationType,
        institutionCode: account.settlementInstitutionCode,
        providerEnvironment: account.providerEnvironment,
        providerVerified: account.providerVerified,
        status: account.status,
      },
      effects: [{
        type: "audit.project",
        payload: {
          action: "provider_account_associe",
          details: {
            destinationType: account.destinationType,
            institutionCode: account.settlementInstitutionCode,
            providerEnvironment: account.providerEnvironment,
            providerVerified: account.providerVerified,
            status: account.status,
          },
        },
      }],
    });
    return toPayoutDestinationDTO(account);
  });
}

export async function associatePaystackProviderAccount(input: {
  partnerAccountId: string;
  resourceType: "restaurant" | "residence";
  resourceId: string;
  adminId: string;
  providerAccountReference: string;
}) {
  const reference = input.providerAccountReference.trim();
  const providerAccount = await new PaystackGateway().getSubaccount(reference);
  if (
    providerAccount.reference !== reference ||
    !providerAccount.active ||
    !providerAccount.verified ||
    (providerAccount.currency && providerAccount.currency !== "XOF")
  ) {
    throw new Error("Ce subaccount Paystack n’est pas actif, vérifié et compatible XOF.");
  }
  return transactionalDb.transaction(async (tx) => {
    const resource = input.resourceType === "restaurant"
      ? await tx.query.restaurants.findFirst({ where: and(
          eq(restaurants.id, input.resourceId),
          eq(restaurants.partnerAccountId, input.partnerAccountId),
        ) })
      : await tx.query.residences.findFirst({ where: and(
          eq(residences.id, input.resourceId),
          eq(residences.partnerAccountId, input.partnerAccountId),
        ) });
    if (!resource) throw new Error("Le Partner Account ne correspond pas à cette activité.");
    const now = new Date();
    const [account] = await tx.insert(paymentProviderAccounts).values({
      partnerAccountId: input.partnerAccountId,
      provider: "paystack",
      providerAccountReference: reference,
      status: "active",
      destinationType: "bank_account",
      providerEnvironment: providerAccount.environment,
      providerVerified: true,
      settlementInstitutionName: providerAccount.institutionName,
      verifiedAt: now,
      linkedByAdminId: input.adminId,
      linkedByUserId: null,
      disabledAt: null,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: [paymentProviderAccounts.partnerAccountId, paymentProviderAccounts.provider],
      set: {
        providerAccountReference: reference,
        status: "active",
        destinationType: "bank_account",
        providerEnvironment: providerAccount.environment,
        providerVerified: true,
        settlementInstitutionName: providerAccount.institutionName,
        verifiedAt: now,
        linkedByAdminId: input.adminId,
        linkedByUserId: null,
        disabledAt: null,
        updatedAt: now,
      },
    }).returning();
    if (!account) throw new Error("Association du subaccount impossible.");
    await persistAuditLog(tx, {
      adminId: input.adminId,
      action: "provider_account_associe",
      ressourceType: "partner_account",
      ressourceId: input.partnerAccountId,
      details: { provider: "paystack", providerAccountReference: reference, businessName: providerAccount.businessName },
    });
    return account;
  });
}

export async function disablePaystackProviderAccount(input: {
  resourceType: "restaurant" | "residence";
  resourceId: string;
  partnerAccountId: string;
  adminId: string;
}) {
  return transactionalDb.transaction(async (tx) => {
    const resource = input.resourceType === "restaurant"
      ? await tx.query.restaurants.findFirst({ where: and(
          eq(restaurants.id, input.resourceId),
          eq(restaurants.partnerAccountId, input.partnerAccountId),
        ) })
      : await tx.query.residences.findFirst({ where: and(
          eq(residences.id, input.resourceId),
          eq(residences.partnerAccountId, input.partnerAccountId),
        ) });
    if (!resource) throw new Error("Le Partner Account ne correspond pas à cette activité.");
    const now = new Date();
    const [account] = await tx.update(paymentProviderAccounts).set({
      status: "disabled",
      disabledAt: now,
      updatedAt: now,
    }).where(and(
      eq(paymentProviderAccounts.partnerAccountId, input.partnerAccountId),
      eq(paymentProviderAccounts.provider, "paystack"),
      ne(paymentProviderAccounts.status, "disabled"),
    )).returning();
    if (!account) throw new Error("Aucun subaccount Paystack actif.");
    await persistAuditLog(tx, {
      adminId: input.adminId,
      action: "provider_account_desactive",
      ressourceType: "partner_account",
      ressourceId: input.partnerAccountId,
      details: { provider: "paystack", providerAccountReference: account.providerAccountReference },
    });
    return account;
  });
}
