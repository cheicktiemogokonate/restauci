import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { paymentProviderAccounts, residences, restaurants } from "@/lib/db/schema";
import { transactionalDb } from "@/lib/db/transaction";
import { persistAuditLog } from "@/lib/audit";
import { PaystackGateway } from "@/infrastructure/paystack/gateway";

export async function getPaystackProviderAccount(partnerAccountId: string) {
  return db.query.paymentProviderAccounts.findFirst({
    where: and(
      eq(paymentProviderAccounts.partnerAccountId, partnerAccountId),
      eq(paymentProviderAccounts.provider, "paystack"),
    ),
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
      verifiedAt: now,
      linkedByAdminId: input.adminId,
      disabledAt: null,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: [paymentProviderAccounts.partnerAccountId, paymentProviderAccounts.provider],
      set: {
        providerAccountReference: reference,
        status: "active",
        verifiedAt: now,
        linkedByAdminId: input.adminId,
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
      eq(paymentProviderAccounts.status, "active"),
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
