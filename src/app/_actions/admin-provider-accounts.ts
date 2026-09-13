"use server";

import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/modules/auth/server";
import {
  associatePaystackProviderAccount,
  disablePaystackProviderAccount,
} from "@/modules/transactions/server";

export async function associatePaystackSubaccountAction(input: {
  resourceType: "restaurant" | "residence";
  resourceId: string;
  partnerAccountId: string;
  code: string;
}) {
  const admin = await getAdminSession();
  await associatePaystackProviderAccount({
    partnerAccountId: input.partnerAccountId,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    adminId: admin.userId,
    providerAccountReference: input.code,
  });
  revalidatePath(`/admin/${input.resourceType === "restaurant" ? "restaurants" : "residences"}/${input.resourceId}`);
}

export async function disablePaystackSubaccountAction(input: {
  resourceType: "restaurant" | "residence";
  resourceId: string;
  partnerAccountId: string;
}) {
  const admin = await getAdminSession();
  await disablePaystackProviderAccount({
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    partnerAccountId: input.partnerAccountId,
    adminId: admin.userId,
  });
  revalidatePath(`/admin/${input.resourceType === "restaurant" ? "restaurants" : "residences"}/${input.resourceId}`);
}
