import { getCurrentUser } from "@/modules/auth/server";
import { getRestaurantByPartnerAccountId } from "@/modules/restaurants/server";
import { getInitialMenuCategories } from "@/modules/menu/model";
import { redirect } from "next/navigation";
import OnboardingClient from "./OnboardingClient";
import { getEffectiveRestaurantQuota } from "@/modules/quotas/server";
import { getOptionalCurrentPartnerAccount } from "@/modules/partners/server";
import ActivityChoice from "./ActivityChoice";

export default async function OnboardingPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  if (session.role !== "partner") redirect("/admin");
  const partnerAccount = await getOptionalCurrentPartnerAccount();
  if (!partnerAccount) return <ActivityChoice />;
  if (partnerAccount.activityType === "residence") {
    redirect("/partenaire/onboarding");
  }

  const [restaurant, entitlement] = await Promise.all([
    getRestaurantByPartnerAccountId(partnerAccount.id),
    getEffectiveRestaurantQuota(partnerAccount.id),
  ]);

  if (restaurant) {
    redirect("/restaurateur");
  }

  // Toute offre payante demandée reste en attente de validation. Le restaurant
  // démarre donc avec les droits de l'offre Découverte.
  return (
    <OnboardingClient
      userId={partnerAccount.userId}
      plan={{
        name: entitlement.planCode,
        maxDishes: entitlement.limits.dish,
        categories: getInitialMenuCategories(entitlement.limits.category),
      }}
    />
  );
}
