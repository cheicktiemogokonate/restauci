"use client";

import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/shared/ui/cn";
import { useStory } from "../animation-state";
import { formatAmount, request } from "../story-data";
import { RequestCard } from "../ui/RequestCard";

/**
 * Bottom sheet mobile — « petite fiche → fiche développée → confirmation »
 * (spec §9-10).
 *
 * Substitution documentée : le Bottom Sheet beUI est un composant interactif
 * (drag, snap points, portal, scroll-lock) pensé pour être ouvert par un
 * utilisateur. Ici la progression est pilotée par le scroll : on réutilise sa
 * surface visuelle à l'identique (pilule, coins arrondis, tokens) dans un
 * conteneur dont la hauteur est animée par l'orchestrateur GSAP — pas de
 * Morphing Modal. La classe h-[38%] sert d'état initial avant prise en main
 * par GSAP ; en prefers-reduced-motion la hauteur devient une classe fixe.
 */
export interface LocationSheetProps {
  reduced?: boolean;
}

export function LocationSheet({ reduced = false }: LocationSheetProps) {
  const stage = useStory((s) => s.sheet);
  const flow = useStory((s) => s.flow);

  if (stage === "closed") return null;

  return (
    <div
      data-story-sheet
      className={cn(
        "absolute inset-x-2 bottom-2 z-10 flex flex-col overflow-hidden rounded-3xl border border-[#E3EAE5] bg-white shadow-lg",
        reduced
          ? stage === "extended"
            ? "h-[86%]"
            : "h-[38%]"
          : // Pas de transition CSS : GSAP pilote la hauteur en continu.
            "h-[38%]",
      )}
    >
      <div className="flex justify-center pt-2.5 pb-1" aria-hidden>
        <div className="h-1.5 w-10 rounded-full bg-[#C9D6CC]" />
      </div>

      {/* Fiche — visible dès l'ouverture (spec §9) */}
      <div className="px-4" data-story-sheet-header>
        <LocationHeader />
      </div>

      {stage === "extended" ? (
        <SheetExtended flow={flow} />
      ) : (
        <div className="p-4">
          <Button className="h-10 w-full rounded-xl text-sm">
            Voir les détails
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        </div>
      )}
    </div>
  );
}

function LocationHeader() {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-base font-bold text-[#22312A]">
          {request.location}
        </p>
        <p className="mt-0.5 text-xs text-[#7A8A80]">
          {request.locationDistance} · {request.locationAvailability}
        </p>
      </div>
      <span className="shrink-0 rounded-full bg-[#F0F7F1] px-2 py-1 text-xs font-bold text-primary">
        ★ {request.locationRating}
      </span>
    </div>
  );
}

/**
 * Flow générique très court (spec §10) : sélection → confirmation → carte
 * « Demande confirmée ». Les étapes sont forward-only (store), jamais rejouées.
 */
function SheetExtended({ flow }: { flow: "hidden" | "options" | "confirm" | "confirmed" }) {
  if (flow === "confirmed") {
    return (
      <div className="mt-3 flex flex-1 flex-col gap-3 border-t border-[#ECF1ED] px-4 pt-4 pb-5" data-story-confirmed>
        <RequestCard
          id={request.id}
          amountLabel={formatAmount(request.amount)}
          status="confirmee"
        />
        <p className="flex items-center gap-1.5 text-xs text-[#7A8A80]">
          <Check className="size-3.5 text-emerald-600" aria-hidden />
          Suivi en temps réel disponible dans l'application.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-1 flex-col gap-3 border-t border-[#ECF1ED] px-4 pt-4 pb-5" data-story-flow>
      <div>
        <p className="text-[11px] font-semibold tracking-wide text-[#7A8A80] uppercase">
          Votre sélection
        </p>
        <div className="mt-2 flex items-center justify-between rounded-xl border border-[#E3EAE5] bg-[#FAFCFA] px-3 py-2.5">
          <div>
            <p className="text-sm font-semibold text-[#22312A]">
              {request.option}
            </p>
            <p className="text-xs text-[#7A8A80]">{request.day}</p>
          </div>
          <p className="text-base font-bold text-primary">
            {formatAmount(request.amount)}
          </p>
        </div>
      </div>

      {flow === "options" ? (
        <Button className="mt-auto h-10 w-full rounded-xl text-sm" data-story-cta-continue>
          Continuer
          <ArrowRight className="size-4" aria-hidden />
        </Button>
      ) : (
        <Button className="mt-auto h-10 w-full rounded-xl text-sm" data-story-cta-confirm>
          Confirmer ma demande
        </Button>
      )}
    </div>
  );
}
