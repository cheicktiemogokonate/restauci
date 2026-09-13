"use server";

import { revalidatePath }  from "next/cache";
import { getAdminSession } from "@/modules/auth/server";
import {
  reactivatePartnerOwner,
  suspendPartnerOwner,
} from "@/modules/partners/server";
import { reactivateClient, suspendClient } from "@/modules/clients/server";

export async function suspendreUserAction(userId: string, motif: string) {
  if (motif.trim().length < 5) return { error: "Motif trop court" };
  const admin = await getAdminSession();
  await suspendPartnerOwner(userId, admin.userId, motif.trim());
  revalidatePath("/admin/users");
  return { success: true };
}

export async function reactiverUserAction(userId: string) {
  const admin = await getAdminSession();
  await reactivatePartnerOwner(userId, admin.userId);
  revalidatePath("/admin/users");
  return { success: true };
}

export async function suspendreClientAction(clientId: string, motif: string) {
  if (motif.trim().length < 5) return { error: "Motif trop court" };
  const admin = await getAdminSession();
  await suspendClient(
    { adminId: admin.userId },
    { clientId, reason: motif.trim() },
  );
  revalidatePath("/admin/users");
  return { success: true };
}

export async function reactiverClientAction(clientId: string) {
  const admin = await getAdminSession();
  await reactivateClient({ adminId: admin.userId }, clientId);
  revalidatePath("/admin/users");
  return { success: true };
}
