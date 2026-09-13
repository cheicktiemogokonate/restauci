"use server";

import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/modules/auth/server";
import {
  rejectPartnerIdentity,
  verifyPartnerIdentity,
} from "@/modules/identity/server";
import { getRestaurantAccessByPartnerAccountId } from "@/modules/restaurants/server";
import { invalidateRestaurantCache } from "@/infrastructure/cache";

async function revalidateIdentityEligibility(input: {
  partnerAccountId: string;
  activityType: "restaurant" | "residence";
}) {
  if (input.activityType === "restaurant") {
    const restaurant = await getRestaurantAccessByPartnerAccountId(
      input.partnerAccountId,
    );
    if (restaurant) {
      await invalidateRestaurantCache(restaurant.id, restaurant.slug);
      revalidatePath(`/restaurant/${restaurant.slug}`);
      revalidatePath(`/client/restaurant/${restaurant.slug}`);
    }
    revalidatePath("/client");
  } else {
    revalidatePath("/residences");
  }
  revalidatePath("/partenaire");
}

export async function verifyPartnerIdentityAction(verificationId: string) {
  const admin = await getAdminSession();
  const verification = await verifyPartnerIdentity(admin.userId, { verificationId });
  if (verification) await revalidateIdentityEligibility(verification);
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
  const verification = await rejectPartnerIdentity(admin.userId, input);
  if (verification) await revalidateIdentityEligibility(verification);
  revalidatePath("/admin/verifications");
  revalidatePath(`/admin/verifications/${input.verificationId}`);
  revalidatePath("/partenaire/verification");
  return {
    success: true as const,
    message: "Le dossier a été renvoyé au partenaire.",
  };
}
