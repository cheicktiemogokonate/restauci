"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import {
  requireCurrentPartnerContext,
  requirePartnerAccount,
} from "@/modules/partners/server";
import {
  assertPartnerIdentityVerified,
  savePartnerIdentityDraft,
  submitPartnerIdentityVerification,
} from "@/modules/identity/server";
import type { IdentityDraftInput } from "@/modules/identity/contracts";
import { IdentityVerificationError } from "@/modules/identity/model";
import {
  configurePartnerPayoutDestination,
  refreshPartnerPayoutDestination,
} from "@/modules/transactions/server";
import type { ConfigurePayoutDestinationInput } from "@/modules/transactions/contracts";
import { PayoutDestinationError } from "@/modules/transactions/model";

function expectedIdentityActionError(error: unknown) {
  if (error instanceof IdentityVerificationError) return error.message;
  if (error instanceof ZodError) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[identity] Payload partenaire invalide:",
        error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      );
    }
    return error.issues[0]?.message ?? "Vérifiez les informations saisies.";
  }
  console.error("[identity] action partenaire impossible", error);
  return "La vérification d’identité est momentanément indisponible.";
}

function expectedPayoutActionError(error: unknown) {
  if (
    error instanceof IdentityVerificationError ||
    error instanceof PayoutDestinationError
  ) {
    return error.message;
  }
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Vérifiez les informations saisies.";
  }
  console.error("[payout] action partenaire impossible", error);
  return "Le service de versement est momentanément indisponible.";
}

export async function saveIdentityDraftAction(input: IdentityDraftInput) {
  try {
    const partnerAccount = await requirePartnerAccount();
    const verification = await savePartnerIdentityDraft(partnerAccount.id, input);
    revalidatePath("/partenaire/verification");
    return {
      success: true as const,
      message: "Brouillon enregistré.",
      verification,
    };
  } catch (error) {
    return {
      success: false as const,
      message: expectedIdentityActionError(error),
    };
  }
}

export async function submitIdentityVerificationAction(
  input: IdentityDraftInput,
) {
  try {
    const partnerAccount = await requirePartnerAccount();
    const verification = await submitPartnerIdentityVerification(
      partnerAccount.id,
      input,
    );
    revalidatePath("/partenaire/verification");
    revalidatePath("/admin/verifications");
    return {
      success: true as const,
      message: "Votre dossier a été transmis pour vérification.",
      verification,
    };
  } catch (error) {
    return {
      success: false as const,
      message: expectedIdentityActionError(error),
    };
  }
}

export async function configurePayoutDestinationAction(
  input: ConfigurePayoutDestinationInput,
) {
  try {
    const context = await requireCurrentPartnerContext();
    const verification = await assertPartnerIdentityVerified(
      context.partnerAccount.id,
    );
    const destination = await configurePartnerPayoutDestination({
      ...input,
      partnerAccountId: context.partnerAccount.id,
      userId: context.identity.userId,
      businessName: verification.legalName,
    });
    revalidatePath("/partenaire/verification");
    return {
      success: true as const,
      message: destination.status === "active"
        ? "Votre destination de versement est active."
        : "Votre destination est créée et attend la validation Paystack.",
      destination,
    };
  } catch (error) {
    return {
      success: false as const,
      message: expectedPayoutActionError(error),
    };
  }
}

export async function refreshPayoutDestinationAction() {
  try {
    const context = await requireCurrentPartnerContext();
    await assertPartnerIdentityVerified(context.partnerAccount.id);
    const destination = await refreshPartnerPayoutDestination({
      partnerAccountId: context.partnerAccount.id,
      userId: context.identity.userId,
    });
    revalidatePath("/partenaire/verification");
    return {
      success: true as const,
      message: destination.status === "active"
        ? "La destination est maintenant active."
        : "Paystack poursuit encore sa vérification.",
      destination,
    };
  } catch (error) {
    return {
      success: false as const,
      message: expectedPayoutActionError(error),
    };
  }
}
