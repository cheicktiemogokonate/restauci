"use client";

import { requestHistory } from "../story-data";
import { formatAmount } from "../story-data";
import { useStory } from "../animation-state";
import { RequestCard, type RequestCardStatus } from "../ui/RequestCard";
import { cn } from "@/shared/ui/cn";

/** Vue « Demandes » du mockup Safari : quelques cards, pas de DataTable
 * (spec §16). #D-2048 est la demande créée dans l'iPhone — le montant vient
 * de la même source de données. Son statut suit l'avancée du traitement. */
export function RequestsView() {
  const relief = useStory((s) => s.view === "detail");
  const status = useStory((s) => s.status);

  const storyStatus: RequestCardStatus =
    status === "recue" ? "nouvelle" : status;

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div>
        <h3 className="text-lg font-bold text-[#22312A]">Demandes</h3>
        <p className="text-xs text-[#7A8A80]">3 demandes ce jour</p>
      </div>

      <div className="flex flex-col gap-3">
        {requestHistory.map((item) => {
          const isStory =
            "isStoryRequest" in item && item.isStoryRequest === true;
          return (
            <div
              key={item.id}
              data-story-request={item.id}
              className={cn(
                "transition-all duration-500",
                isStory && relief && "scale-[1.03]",
                !isStory && relief && "opacity-45",
              )}
            >
              <RequestCard
                id={item.id}
                amountLabel={formatAmount(item.amount)}
                status={isStory ? storyStatus : item.status}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
