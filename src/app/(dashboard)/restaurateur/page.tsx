import { getCurrentUser } from "@/lib/auth";
import { getMyRestaurant } from "@/lib/db/queries";
import { redirect } from "next/navigation";
import { Suspense } from "react";

// Composants async (chaque section se charge indépendamment)
import { RecentOrdersSection } from "@/components/dashboard/stats/recent-orders-section";
import { RevenueSection } from "@/components/dashboard/stats/revenue-section";
import { StatsSection } from "@/components/dashboard/stats/stats-section";
import { TrendingSection } from "@/components/dashboard/stats/trending-section";
import { StatsShell } from "@/components/dashboard/stats/stats-shell";

import {
  OrdersOverviewSection,
  OrderTypesSection,
  TopCategoriesSection,
} from "@/components/dashboard/stats/dashboard-secondary-sections";

// Skeletons (fallback pendant le chargement de chaque section)
import {
  ChartSkeleton,
  RecentOrdersSkeleton,
  WidgetSkeleton,
} from "@/components/dashboard/stats/skeletons";

export default async function RestaurateurDashboardPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");
  if (currentUser.role !== "restaurateur") redirect("/login");

  const restaurant = await getMyRestaurant(currentUser.userId);
  if (!restaurant) redirect("/onboarding");

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-7xl px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-6 space-y-4 sm:space-y-6">
          {/* Section KPIs — streame indépendamment */}
          <Suspense fallback={<StatsShell restaurantId={restaurant.id} />}>
            <StatsSection restaurantId={restaurant.id} />
          </Suspense>

          {/* Graphique + Catégories */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Suspense fallback={<ChartSkeleton />}>
              <RevenueSection restaurantId={restaurant.id} />
            </Suspense>
            <Suspense fallback={<WidgetSkeleton />}>
              <TopCategoriesSection restaurantId={restaurant.id} />
            </Suspense>
          </div>

          {/* Widgets KPI secondaires */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Suspense fallback={<WidgetSkeleton />}>
              <OrdersOverviewSection restaurantId={restaurant.id} />
            </Suspense>
            <Suspense fallback={<WidgetSkeleton />}>
              <OrderTypesSection restaurantId={restaurant.id} />
            </Suspense>
            <div className="md:col-span-2 xl:col-span-1">
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
