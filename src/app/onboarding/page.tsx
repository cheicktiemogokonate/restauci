import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getMyRestaurant } from "@/lib/db/queries";
import { getInitialMenuCategories } from "@/lib/menu/default-categories";
import { redirect } from "next/navigation";
import OnboardingClient from "./OnboardingClient";

export default async function OnboardingPage() {
  const session = await getCurrentUser();

  if (!session) {
    redirect("/login");
  }

  const [restaurant, initialPlan] = await Promise.all([
    getMyRestaurant(session.userId),
    db.query.subscriptionPlans.findFirst({
      where: (plan, { eq }) => eq(plan.code, "decouverte"),
    }),
  ]);

  if (restaurant) {
    redirect("/restaurateur");
  }

  // Toute offre payante demandée reste en attente de validation. Le restaurant
  // démarre donc avec les droits de l'offre Découverte.
  if (!initialPlan) {
    throw new Error(
      "Catalogue des abonnements invalide : offre Découverte introuvable.",
    );
  }

  return (
    <OnboardingClient
      userId={session.userId}
      plan={{
        name: initialPlan.nom,
        maxDishes: initialPlan.maxPlats,
        categories: getInitialMenuCategories(initialPlan.maxCategories),
      }}
    />
  );
}
