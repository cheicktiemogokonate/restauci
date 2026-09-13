"use client";

import { brandName, safariMockup } from "./content";
import { storyActions, useStory } from "./animation-state";
import { Safari } from "./vendor/safari";
import { ScreenScaler } from "./vendor/ScreenScaler";
import { AnimatedToastStack } from "./vendor/animated-toast-stack";
import { MiniSidebar } from "./ui/MiniSidebar";
import { DashboardOverview } from "./dashboard/DashboardOverview";
import { RequestsView } from "./dashboard/RequestsView";
import { RequestDetails } from "./dashboard/RequestDetails";

/**
 * Safari — le même logiciel pendant toute la séquence établissement (spec §13) :
 * une seule fenêtre dont le contenu évolue (Vue d'ensemble → Demandes → Détail).
 * Les trois vues restent montées et se remplacent ; les notifications vivent
 * à l'intérieur de la fenêtre (AnimatedToastStack beUI, placement absolute).
 */
export function SafariWindow() {
  const view = useStory((s) => s.view);
  const badge = useStory((s) => s.badge);
  const toasts = useStory((s) => s.toasts);

  return (
    <Safari url={safariMockup.url}>
      <ScreenScaler designWidth={1200}>
        <div className="relative flex h-full w-full bg-[#FBFDFB]">
          <MiniSidebar view={view} requestsBadge={badge} />

          <div className="relative min-w-0 flex-1">
            {/* Vues empilées : montage permanent, visibilité pilotée par le store. */}
            <div
              className="absolute inset-0"
              style={{ visibility: view === "overview" ? "visible" : "hidden" }}
            >
              <DashboardOverview />
            </div>
            <div
              className="absolute inset-0"
              style={{ visibility: view === "requests" ? "visible" : "hidden" }}
            >
              <RequestsView />
            </div>
            <div
              className="absolute inset-0"
              style={{ visibility: view === "detail" ? "visible" : "hidden" }}
            >
              <RequestDetails />
            </div>

            {/* Point d'atterrissage visuel du vol de carte (§12) : ancre invisible. */}
            <div
              data-story-dropzone
              aria-hidden
              className="absolute top-20 right-6 h-20 w-64"
            />

            {/* Notifications internes à la fenêtre (§14/§18/§20). */}
            <AnimatedToastStack
              toasts={toasts}
              onDismiss={storyActions.dismissToast}
              position="top-right"
              placement="absolute"
              className="top-4 right-4 w-[300px] scale-[0.92] origin-top-right"
              classNames={{ surface: "rounded-xl p-2.5 shadow-lg", item: "text-xs" }}
            />
          </div>

          {/* Signature discrète de l'espace établissement. */}
          <span className="absolute right-4 bottom-2 text-[10px] tracking-wide text-[#B7C4BB]">
            {brandName} · Espace établissement
          </span>
        </div>
      </ScreenScaler>
    </Safari>
  );
}
