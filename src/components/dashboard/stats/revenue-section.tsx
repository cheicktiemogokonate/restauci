import { getDashboardDailyData } from "./dashboard-data";
import { RevenueChart } from "./revenue-chart";

interface RevenueSectionProps {
  restaurantId: string;
}

/**
 * Composant async qui fetch l'évolution du CA sur 7 jours.
 * Doit être enveloppé dans <Suspense fallback={<ChartSkeleton />}>.
 */
export async function RevenueSection({ restaurantId }: RevenueSectionProps) {
  const donnees = await getDashboardDailyData(restaurantId);

  const data = donnees.map((d) => ({
    date: d.jour,
    revenue: Number(d.total),
  }));

  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);

  return <RevenueChart data={data} totalRevenue={totalRevenue} />;
}
