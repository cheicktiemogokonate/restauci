import { getCurrentUser } from "@/lib/auth";
import { getMyRestaurant } from "@/lib/db/queries";
import { redirect } from "next/navigation";
import OnboardingClient from "./OnboardingClient";

export default async function OnboardingPage() {
  const session = await getCurrentUser();

  if (!session) {
    redirect("/login");
  }

  const restaurant = await getMyRestaurant(session.userId);
  if (restaurant) {
    redirect("/restaurateur");
  }

  return <OnboardingClient userId={session.userId} />;
}
