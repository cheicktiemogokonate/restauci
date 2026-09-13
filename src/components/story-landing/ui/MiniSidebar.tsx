"use client";

import { motion } from "motion/react";
import { LayoutDashboard, ClipboardList, Activity, Settings } from "lucide-react";
import { SPRING_LAYOUT } from "@/shared/ui/motion";
import { cn } from "@/shared/ui/cn";

export type SidebarView = "overview" | "requests" | "detail";

const ITEMS = [
  { id: "overview" as const, label: "Vue d'ensemble", icon: LayoutDashboard },
  { id: "requests" as const, label: "Demandes", icon: ClipboardList },
  { id: "activity" as const, label: "Activité", icon: Activity },
  { id: "settings" as const, label: "Paramètres", icon: Settings },
];

export interface MiniSidebarProps {
  view: SidebarView;
  /** Compteur du badge « Demandes » (0 = pas de badge). */
  requestsBadge: number;
}

/**
 * Sidebar animée du mockup Safari.
 *
 * Substitution documentée : le composant beUI « Animated Sidebar » est un
 * système complet (provider, collapsible, mobile sheet, persistance — 32 Ko)
 * prévu pour une vraie application ; dans un mockup narratif non interactif,
 * seul son langage visuel est requis. Ce wrapper léger conserve la signature
 * beUI : indicateur de sélection à fond partagé (layoutId) et badge animé.
 */
export function MiniSidebar({ view, requestsBadge }: MiniSidebarProps) {
  // « Demandes » reste l'entrée active tant que la vue détail est ouverte.
  const activeId =
    view === "overview" ? "overview" : view === "requests" || view === "detail" ? "requests" : null;

  return (
    <nav
      aria-label="Navigation de l'espace établissement"
      className="flex h-full w-[200px] shrink-0 flex-col gap-1 border-r border-[#E7EEE9] bg-[#F4F8F5] px-3 py-4"
    >
      {ITEMS.map((item) => {
        const active = item.id === activeId;
        return (
          <div
            key={item.id}
            className={cn(
              "relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
              active ? "text-[#0F3D22]" : "text-[#6B7C71]",
            )}
          >
            {active ? (
              <motion.span
                layoutId="sl-sidebar-indicator"
                transition={SPRING_LAYOUT}
                className="absolute inset-0 rounded-lg bg-[#DFEDE2]"
                aria-hidden
              />
            ) : null}
            <item.icon className="relative z-10 h-4 w-4 shrink-0" aria-hidden />
            <span className="relative z-10 truncate">{item.label}</span>
            {item.id === "requests" && requestsBadge > 0 ? (
              <motion.span
                key={requestsBadge}
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={SPRING_LAYOUT}
                className="relative z-10 ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white"
                aria-label={`${requestsBadge} nouvelle${requestsBadge > 1 ? "s" : ""} demande${requestsBadge > 1 ? "s" : ""}`}
              >
                {requestsBadge}
              </motion.span>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
