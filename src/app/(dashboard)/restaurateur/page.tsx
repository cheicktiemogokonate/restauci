import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  Header,
  StatsCards,
  RevenueChart,
  OrdersOverview,
  TopCategories,
  OrderTypes,
  TrendingMenus,
  RecentOrders,
  CustomerReviews,
  RecentActivity,
} from "@/components/dashboard";

export default async function RestaurateurDashboardPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  return (
    <div className="flex flex-1 flex-col overflow-hidden w-[100vw-260px]">
      <Header />

      <main className="flex-1 overflow-y-auto mt-16">
        <div className="container mx-auto p-4 lg:p-6 space-y-6">
          <StatsCards />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <RevenueChart />
            <TopCategories />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <OrdersOverview />
            <OrderTypes />
            <div className="lg:col-span-1 xl:col-span-1">
              <TrendingMenus />
            </div>
          </div>

          <RecentOrders />

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <CustomerReviews />
            </div>
            <RecentActivity />
          </div>
        </div>
      </main>

      <footer className="border-t border-border bg-card px-4 py-4 lg:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>Copyright 2025 Peterpraise. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-foreground transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Terms and conditions
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

