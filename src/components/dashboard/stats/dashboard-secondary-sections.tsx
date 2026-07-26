import {
  getCategoriesRestaurant,
  getCommandesParMode,
} from "@/lib/db/queries";
import { getDashboardDailyData } from "./dashboard-data";
import { OrderTypes } from "./order-types";
import { OrdersOverview } from "./orders-overview";
import { TopCategories } from "./top-categories";

interface DashboardSectionProps {
  restaurantId: string;
}

/**
 * Ces widgets sont volontairement séparés : le dashboard peut streamer une
 * information utile dès qu'elle est prête, au lieu d'attendre toutes les
 * agrégations de la page avant le premier rendu.
 */
export async function OrdersOverviewSection({
  restaurantId,
}: DashboardSectionProps) {
  const commandesParJour = await getDashboardDailyData(restaurantId);

  const data = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const dateKey = date.toISOString().slice(0, 10);
    const match = commandesParJour.find((entry) => entry.jour === dateKey);

    return {
      date: date.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
      }),
      orders: match ? Number(match.count) : 0,
    };
  });

  return (
    <OrdersOverview
      data={data}
      totalOrders={data.reduce((sum, item) => sum + item.orders, 0)}
    />
  );
}

export async function OrderTypesSection({
  restaurantId,
}: DashboardSectionProps) {
  const commandesParMode = await getCommandesParMode(restaurantId);
  const total = commandesParMode.reduce((sum, item) => sum + item.count, 0);

  const data = [
    {
      label: "Sur place",
      type: "sur_place" as const,
      queryType: "sur_place" as const,
      color: "#10b981",
    },
    {
      label: "À emporter",
      type: "a_emporter" as const,
      queryType: "emporter" as const,
      color: "#3b82f6",
    },
    {
      label: "Livraison",
      type: "livraison" as const,
      queryType: "livraison" as const,
      color: "#f59e0b",
    },
  ].map((entry) => {
    const match = commandesParMode.find(
      (item) => item.modeCommande === entry.queryType,
    );
    const count = match?.count ?? 0;

    return {
      label: entry.label,
      type: entry.type,
      count,
      color: entry.color,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    };
  });

  return <OrderTypes data={data} />;
}

export async function TopCategoriesSection({
  restaurantId,
}: DashboardSectionProps) {
  const categories = await getCategoriesRestaurant(restaurantId);
  const categoryStats = categories
    .map((category) => ({
      name: category.nom,
      value: (category.plats ?? []).reduce(
        (sum, plat) => sum + (plat.nombreCommandes ?? 0),
        0,
      ),
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 4);

  const total = categoryStats.reduce((sum, item) => sum + item.value, 0);
  const colors = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6"];

  return (
    <TopCategories
      data={categoryStats.map((item, index) => ({
        name: item.name,
        value: total > 0 ? Math.round((item.value / total) * 100) : 0,
        color: colors[index] ?? "#6b7280",
      }))}
    />
  );
}
