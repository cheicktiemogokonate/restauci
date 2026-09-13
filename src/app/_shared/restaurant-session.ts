import "server-only";

import { redirect } from "next/navigation";
import { requireCurrentPartnerContext } from "@/modules/partners/server";
import { getRestaurantByPartnerAccountId } from "@/modules/restaurants/server";

export async function getRestaurateurSession() {
  const { identity: session, partnerAccount } =
    await requireCurrentPartnerContext("restaurant");
  const restaurant = await getRestaurantByPartnerAccountId(partnerAccount.id);
  if (!restaurant) redirect("/onboarding");
  return { session, partnerAccount, restaurant };
}
