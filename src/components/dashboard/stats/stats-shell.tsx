"use client";

import { useEffect, useState } from "react";
import { StatsCards } from "./stats-cards";
import type { StatsDashboard } from "@/types/dashboard";
import { useRealtimeContext } from "@/components/dashboard/layout/dashboard-realtime-provider";

const STORAGE_KEY_PREFIX = "dashboard:stats:";

function loadCached(restaurantId: string): StatsDashboard {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + restaurantId);
    if (!raw) throw new Error("no cache");
    return JSON.parse(raw) as StatsDashboard;
  } catch {
    return {
      commandesAujourdhui: 0,
      commandesMois: 0,
      chiffreAffairesMois: 0,
      commandesEnCours: 0,
      commandesEnPreparation: 0,
      commandesPrêtes: 0,
    };
  }
}

function saveCached(restaurantId: string, stats: StatsDashboard) {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + restaurantId, JSON.stringify(stats));
  } catch {
    // ignore
  }
}

interface StatsShellProps {
  restaurantId: string;
  /** Valeurs serveur au premier affichage ; le cache reste le fallback Suspense. */
  initialStats?: StatsDashboard;
}

export function StatsShell({ restaurantId, initialStats }: StatsShellProps) {
  const { latestEvent } = useRealtimeContext();
  const [stats, setStats] = useState<StatsDashboard>(
    () => initialStats ?? loadCached(restaurantId),
  );

  useEffect(() => {
    if (!initialStats) return;
    saveCached(restaurantId, initialStats);
  }, [initialStats, restaurantId]);

  // Apply realtime deltas to cached stats for immediate feedback
  useEffect(() => {
    if (!latestEvent) return;
    const timer = window.setTimeout(() => {
      setStats((prev) => {
        const next = { ...prev };
        const data = latestEvent.data as {
          statut?: string;
          total?: number;
        };

        if (latestEvent.type === "nouvelle_commande") {
          next.commandesAujourdhui = (next.commandesAujourdhui || 0) + 1;
          next.commandesMois = (next.commandesMois || 0) + 1;
          next.commandesEnCours = (next.commandesEnCours || 0) + 1;
        } else if (
          latestEvent.type === "statut" &&
          data.statut === "en_preparation"
        ) {
          next.commandesEnCours = Math.max((next.commandesEnCours || 0) - 1, 0);
          next.commandesEnPreparation = (next.commandesEnPreparation || 0) + 1;
        } else if (
          latestEvent.type === "statut" &&
          data.statut === "prete"
        ) {
          next.commandesPrêtes = (next.commandesPrêtes || 0) + 1;
          next.commandesEnPreparation = Math.max((next.commandesEnPreparation || 0) - 1, 0);
        } else if (
          latestEvent.type === "statut" &&
          data.statut === "servie"
        ) {
          next.commandesPrêtes = Math.max((next.commandesPrêtes || 0) - 1, 0);
          next.chiffreAffairesMois =
            (next.chiffreAffairesMois || 0) + Number(data.total ?? 0);
        } else if (latestEvent.type === "commande_annulee") {
          // Le statut précédent n'est pas transporté dans cet événement : le
          // prochain refresh serveur réconcilie précisément les compteurs.
        }
        saveCached(restaurantId, next);
        return next;
      });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [latestEvent, restaurantId]);

  return <StatsCards stats={stats} />;
}
