"use server";

import { getAdminSession } from "@/modules/auth/server";
import {
  createAdminAccount,
  reactivateAdminAccount,
  resetAdminPassword,
  suspendAdminAccount,
} from "@/modules/admin-accounts/server";
import { revalidatePath } from "next/cache";

function messageFrom(error: unknown) {
  return error instanceof Error ? error.message : "L’opération a échoué.";
}

export async function createAdminAccountAction(input: {
  email: string;
  nom: string;
  telephone: string;
  actorPassword: string;
}) {
  try {
    const admin = await getAdminSession();
    const result = await createAdminAccount({ adminId: admin.userId }, input);
    revalidatePath("/admin/users");
    return { success: true as const, temporaryPassword: result.temporaryPassword };
  } catch (error) {
    return { success: false as const, error: messageFrom(error) };
  }
}
export async function resetAdminPasswordAction(input: {
  adminId: string;
  actorPassword: string;
}) {
  try {
    const admin = await getAdminSession();
    const result = await resetAdminPassword({ adminId: admin.userId }, input);
    revalidatePath("/admin/users");
    return { success: true as const, temporaryPassword: result.temporaryPassword };
  } catch (error) {
    return { success: false as const, error: messageFrom(error) };
  }
}

export async function suspendAdminAccountAction(input: {
  adminId: string;
  motif: string;
}) {
  try {
    const admin = await getAdminSession();
    await suspendAdminAccount({ adminId: admin.userId }, input);
    revalidatePath("/admin/users");
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: messageFrom(error) };
  }
}

export async function reactivateAdminAccountAction(adminId: string) {
  try {
    const admin = await getAdminSession();
    await reactivateAdminAccount({ adminId: admin.userId }, adminId);
    revalidatePath("/admin/users");
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: messageFrom(error) };
  }
}
