import { getCurrentUser } from "@/lib/auth";
import { getRestaurantByPartnerAccountId } from "@/lib/db/queries";
import { getInitialMenuCategories } from "@/lib/menu/default-categories";
import { redirect } from "next/navigation";
import OnboardingClient from "./OnboardingClient";
import { getEffectiveLimits } from "@/lib/quota-entitlements";
import { getPartnerAccountByUserId } from "@/modules/partners/server";
import ActivityChoice from "./ActivityChoice";

export default async function OnboardingPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  if (session.role !== "partner") redirect("/admin");
  const partnerAccount = await getPartnerAccountByUserId(session.userId);
  if (!partnerAccount) return <ActivityChoice />;
  if (partnerAccount.activityType === "residence") {
    redirect("/partenaire/onboarding");
  }

  const [restaurant, entitlement] = await Promise.all([
    getRestaurantByPartnerAccountId(partnerAccount.id),
    getEffectiveLimits(partnerAccount.id),
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
        name: entitlement.plan.nom,
        maxDishes: entitlement.limits.dish,
        categories: getInitialMenuCategories(entitlement.limits.category),
      }}
    />
  );
}
