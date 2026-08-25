"use server";

import { revalidatePath } from "next/cache";
import { requirePartnerAccount } from "@/lib/auth/partner-account";
import {
  savePartnerIdentityDraft,
  submitPartnerIdentityVerification,
} from "@/modules/identity/server";
import type { IdentityDraftInput } from "@/modules/identity/contracts";

export async function saveIdentityDraftAction(input: IdentityDraftInput) {
  const partnerAccount = await requirePartnerAccount();
  await savePartnerIdentityDraft(partnerAccount.id, input);
  revalidatePath("/partenaire/verification");
  return { success: true as const, message: "Brouillon enregistré." };
}

export async function submitIdentityVerificationAction(
  input: IdentityDraftInput,
) {
  const partnerAccount = await requirePartnerAccount();
  await submitPartnerIdentityVerification(partnerAccount.id, input);
  revalidatePath("/partenaire/verification");
  revalidatePath("/admin/verifications");
  return {
    success: true as const,
    message: "Votre dossier a été transmis pour vérification.",
  };
}
