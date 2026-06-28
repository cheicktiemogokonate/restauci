import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton pour les 3 cartes KPI (StatsCards).
 * Même grille et dimensions que le composant réel.
 */
export function StatsCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="relative overflow-hidden p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-7 w-20" />
            </div>
            <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg shrink-0" />
          </div>
        </Card>
      ))}
    </div>
  );
}

/**
 * Skeleton pour le graphique de revenus (RevenueChart).
 * Même structure card + barres de graphique animées.
 */
export function ChartSkeleton() {
  return (
    <Card className="col-span-full lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-7 w-28" />
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {/* Barres du graphique simulées */}
        <div className="flex items-end gap-2 h-50 sm:h-[250px] pt-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton
              key={i}
              className="flex-1 rounded-t-lg"
              style={{ height: `${25 + (i % 4) * 20}%` }}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton pour le panneau TopCategories (col-span-1).
 */
export function TopCategoriesSkeleton() {
  return (
    <Card className="col-span-full lg:col-span-1">
      <CardHeader>
        <Skeleton className="h-4 w-36" />
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="flex justify-between">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3.5 w-12" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton pour les widgets OrdersOverview / OrderTypes / TrendingMenus.
 */
export function WidgetSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-4 w-40" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton pour le tableau des commandes récentes (RecentOrders).
 */
export function RecentOrdersSkeleton() {
  return (
    <Card className="col-span-full">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-16" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* En-têtes de tableau */}
          <div className="flex gap-4 pb-2 border-b">
            {["w-24", "w-20", "w-16", "w-20", "w-28", "w-20"].map((w, i) => (
              <Skeleton key={i} className={`h-3 ${w}`} />
            ))}
          </div>
          {/* Lignes */}
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4 items-center py-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
