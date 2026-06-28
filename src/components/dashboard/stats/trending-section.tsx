import { getTopPlats } from "@/lib/db/queries";
import { TrendingMenus } from "./trending-menus";

interface TrendingSectionProps {
  restaurantId: string;
}

/**
 * Composant async qui fetch les top plats commandés.
 * Doit être enveloppé dans <Suspense fallback={<WidgetSkeleton />}>.
 */
export async function TrendingSection({ restaurantId }: TrendingSectionProps) {
  const menus = await getTopPlats(restaurantId, 3);
  return <TrendingMenus menus={menus} />;
}
