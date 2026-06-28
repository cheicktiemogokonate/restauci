import { getCommandes } from "@/lib/db/queries";
import { RecentOrders } from "./recent-orders";
import type { CommandeResume } from "@/types/dashboard";

interface RecentOrdersSectionProps {
  restaurantId: string;
}

/**
 * Composant async qui fetch les 5 commandes les plus récentes.
 * Doit être enveloppé dans <Suspense fallback={<RecentOrdersSkeleton />}>.
 */
export async function RecentOrdersSection({
  restaurantId,
}: RecentOrdersSectionProps) {
  const { items } = await getCommandes({
    restaurantId,
    limit: 5,
    page: 1,
  });

  const commandes: CommandeResume[] = items.map((c) => ({
    ...c,
    clientNom: c.nomClient ?? "Client",
    statutLabel: c.statut,
    type: c.modeCommande,
  }));

  return <RecentOrders commandes={commandes} />;
}
