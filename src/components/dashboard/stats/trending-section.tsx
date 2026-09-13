import { getTopMenuDishes } from "@/modules/menu/server";
import { TrendingMenus } from "./trending-menus";

interface TrendingSectionProps {
  restaurantId: string;
}

/**
 * Composant async qui fetch les top plats commandés.
 * Doit être enveloppé dans <Suspense fallback={<WidgetSkeleton />}>.
 */
export async function TrendingSection({ restaurantId }: TrendingSectionProps) {
  const menus = await getTopMenuDishes(restaurantId, 3);
  return <TrendingMenus menus={menus} />;
}
