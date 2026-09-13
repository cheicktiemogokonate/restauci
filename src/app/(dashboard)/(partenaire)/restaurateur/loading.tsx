import {
  StatsCardsSkeleton,
  ChartSkeleton,
  RecentOrdersSkeleton,
} from "@/components/dashboard/stats/skeletons";

/**
 * Affiché automatiquement par Next.js pendant la navigation vers /restaurateur.
 */
export default function DashboardLoading() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto mt-4">
        <div className="container mx-auto p-4 lg:p-6 space-y-6">
          <StatsCardsSkeleton />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ChartSkeleton />
            <div className="bg-white rounded-2xl border border-border/60 h-48 animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-border/60 h-40 animate-pulse" />
            ))}
          </div>
          <RecentOrdersSkeleton />
        </div>
      </main>
    </div>
  );
}
