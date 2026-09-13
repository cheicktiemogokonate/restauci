"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import type { ChoosePartnerActivityInput } from "@/modules/partners/contracts";
import { PartnerAccountDomainError } from "@/modules/partners/model";
import {
  chooseCurrentPartnerActivity,
  PartnerAuthorizationError,
} from "@/modules/partners/server";

export async function chooseActivityAction(
  activityType: ChoosePartnerActivityInput,
) {
  try {
    const account = await chooseCurrentPartnerActivity(activityType);
    revalidatePath("/onboarding");
    revalidatePath("/partenaire");
    return {
      success: true as const,
      href:
        account.activityType === "restaurant"
          ? "/onboarding"
          : "/partenaire/onboarding",
    };
  } catch (error) {
    if (
      error instanceof PartnerAccountDomainError ||
      error instanceof PartnerAuthorizationError
    ) {
      return { success: false as const, message: error.message };
    }
    if (error instanceof ZodError) {
      return { success: false as const, message: "Activité invalide." };
    }
    console.error("[onboarding] choix activité impossible", error);
    return {
      success: false as const,
      message: "La configuration est momentanément impossible.",
    };
  }
}
