"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getMyRestaurant } from "@/lib/db/queries";

export async function getRestaurateurSession() {
	const session = await getCurrentUser();
	if (!session) redirect("/login");

	const restaurant = await getMyRestaurant(session.userId);
	if (!restaurant) redirect("/onboarding");

	return { session, restaurant };
}

