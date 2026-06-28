import { getCurrentUser } from "@/lib/auth";
import { getMyRestaurant } from "@/lib/db/queries";
import { redirect } from "next/navigation";
import { Suspense } from "react";

// Composants async (chaque section se charge indépendamment)
import { RecentOrdersSection } from "@/components/dashboard/stats/recent-orders-section";
import { RevenueSection } from "@/components/dashboard/stats/revenue-section";
import { StatsSection } from "@/components/dashboard/stats/stats-section";
import { TrendingSection } from "@/components/dashboard/stats/trending-section";

// Composants statiques (pas de fetch — affichés immédiatement)
import { OrderTypes } from "@/components/dashboard/stats/order-types";
import { OrdersOverview } from "@/components/dashboard/stats/orders-overview";
import { TopCategories } from "@/components/dashboard/stats/top-categories";

// Skeletons (fallback pendant le chargement de chaque section)
import {
  ChartSkeleton,
  RecentOrdersSkeleton,
  StatsCardsSkeleton,
  WidgetSkeleton,
} from "@/components/dashboard/stats/skeletons";

export default async function RestaurateurDashboardPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");
  if (currentUser.role !== "restaurateur") redirect("/login");

  const restaurant = await getMyRestaurant(currentUser.userId);
  if (!restaurant) redirect("/onboarding");

  return (
    <div className="flex flex-1 flex-col overflow-hidden w-[100vw-260px]">
      <main className="flex-1 overflow-y-auto mt-4">
        <div className="container mx-auto p-4 lg:p-6 space-y-6">
          {/* Section KPIs — streame indépendamment */}
          <Suspense fallback={<StatsCardsSkeleton />}>
            <StatsSection restaurantId={restaurant.id} />
          </Suspense>

          {/* Graphique + Catégories */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Suspense fallback={<ChartSkeleton />}>
              <RevenueSection restaurantId={restaurant.id} />
            </Suspense>
            <TopCategories />
          </div>

          {/* Widgets KPI secondaires */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <OrdersOverview />
            <OrderTypes />
            <div className="lg:col-span-1 xl:col-span-1">
              <Suspense fallback={<WidgetSkeleton />}>
                <TrendingSection restaurantId={restaurant.id} />
              </Suspense>
            </div>
          </div>

          {/* Commandes récentes — streame indépendamment */}
          <Suspense fallback={<RecentOrdersSkeleton />}>
            <RecentOrdersSection restaurantId={restaurant.id} />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
