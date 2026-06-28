import { getStatsDashboard } from "@/lib/db/queries";
import { StatsCards } from "./stats-cards";
import type { StatsDashboard } from "@/types/dashboard";

interface StatsSectionProps {
  restaurantId: string;
}

/**
 * Composant async qui fetch et affiche les cartes KPI.
 * Doit être enveloppé dans <Suspense fallback={<StatsCardsSkeleton />}>.
 */
export async function StatsSection({ restaurantId }: StatsSectionProps) {
  const dbStats = await getStatsDashboard(restaurantId);

  const stats: StatsDashboard = {
    commandesAujourdhui: dbStats.commandesAujourdhui,
    commandesMois: dbStats.commandesMois,
    chiffreAffairesMois: dbStats.chiffreAffairesMois,
    commandesEnCours:
      dbStats.commandesEnCours.find((c) => c.statut === "recue")?.count ?? 0,
    commandesEnPreparation:
      dbStats.commandesEnCours.find((c) => c.statut === "en_preparation")
        ?.count ?? 0,
    commandesPrêtes:
      dbStats.commandesEnCours.find((c) => c.statut === "prete")?.count ?? 0,
  };

  return <StatsCards stats={stats} />;
}
