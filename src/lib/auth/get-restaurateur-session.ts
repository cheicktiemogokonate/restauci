"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getRestaurantByPartnerAccountId } from "@/lib/db/queries";
import { requirePartnerActivity } from "@/lib/auth/partner-account";

export async function getRestaurateurSession() {
	const session = await getCurrentUser();
	if (!session) redirect("/login");
	const partnerAccount = await requirePartnerActivity("restaurant");

	const restaurant = await getRestaurantByPartnerAccountId(partnerAccount.id);
	if (!restaurant) redirect("/onboarding");

	return { session, partnerAccount, restaurant };
}
