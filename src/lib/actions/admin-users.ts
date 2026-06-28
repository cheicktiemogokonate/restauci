"use server";

import { revalidatePath }  from "next/cache";
import { getAdminSession } from "@/lib/auth/get-admin-session";
import {
  suspendreUser, reactiverUser,
  suspendreClient, reactiverClient,
} from "@/lib/db/mutations-admin";

export async function suspendreUserAction(userId: string, motif: string) {
  if (motif.trim().length < 5) return { error: "Motif trop court" };
  const admin = await getAdminSession();
  await suspendreUser(userId, admin.userId, motif.trim());
  revalidatePath("/admin/users");
  return { success: true };
}

export async function reactiverUserAction(userId: string) {
  const admin = await getAdminSession();
  await reactiverUser(userId, admin.userId);
  revalidatePath("/admin/users");
  return { success: true };
}

export async function suspendreClientAction(clientId: string, motif: string) {
  if (motif.trim().length < 5) return { error: "Motif trop court" };
  const admin = await getAdminSession();
  await suspendreClient(clientId, admin.userId, motif.trim());
  revalidatePath("/admin/users");
  return { success: true };
}

export async function reactiverClientAction(clientId: string) {
  const admin = await getAdminSession();
  await reactiverClient(clientId, admin.userId);
  revalidatePath("/admin/users");
  return { success: true };
}
