"use server";

import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/auth/get-admin-session";
import {
  rejectPartnerIdentity,
  verifyPartnerIdentity,
} from "@/modules/identity/server";

export async function verifyPartnerIdentityAction(verificationId: string) {
  const admin = await getAdminSession();
  await verifyPartnerIdentity(admin.userId, { verificationId });
  revalidatePath("/admin/verifications");
  revalidatePath(`/admin/verifications/${verificationId}`);
  revalidatePath("/partenaire/verification");
  return { success: true as const, message: "Identité vérifiée." };
}

export async function rejectPartnerIdentityAction(input: {
  verificationId: string;
  reason: string;
}) {
  const admin = await getAdminSession();
  await rejectPartnerIdentity(admin.userId, input);
  revalidatePath("/admin/verifications");
  revalidatePath(`/admin/verifications/${input.verificationId}`);
  revalidatePath("/partenaire/verification");
  return {
    success: true as const,
    message: "Le dossier a été renvoyé au partenaire.",
  };
}
