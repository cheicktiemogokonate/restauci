"use client";

import { Clock, Tag, CalendarDays, Hash } from "lucide-react";
import { formatAmount, request } from "../story-data";
import { useStory } from "../animation-state";
import { RequestCard } from "../ui/RequestCard";

/**
 * Détail de la demande #D-2048 dans le mockup Safari (spec §17) :
 * informations génériques minimales, statut vivant (§18).
 */
export function RequestDetails() {
  const status = useStory((s) => s.status);

  return (
    <div className="flex h-full flex-col gap-5 p-6">
      <div>
        <p className="text-xs text-[#7A8A80]">Demandes</p>
        <h3 className="text-lg font-bold text-[#22312A]">
          Demande #{request.id}
        </h3>
      </div>

      <RequestCard
        id={request.id}
        amountLabel={formatAmount(request.amount)}
        status={status === "recue" ? "nouvelle" : status}
      />

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl border border-[#E3EAE5] bg-white px-4 py-3">
          <dt className="flex items-center gap-1.5 text-[11px] font-medium text-[#7A8A80] uppercase">
            <Clock className="size-3" aria-hidden /> Créée à
          </dt>
          <dd className="mt-1 font-semibold text-[#22312A]">
            {request.createdAt}
          </dd>
        </div>
        <div className="rounded-xl border border-[#E3EAE5] bg-white px-4 py-3">
          <dt className="flex items-center gap-1.5 text-[11px] font-medium text-[#7A8A80] uppercase">
            <Tag className="size-3" aria-hidden /> Sélection
          </dt>
          <dd className="mt-1 font-semibold text-[#22312A]">
            {request.option}
          </dd>
        </div>
        <div className="rounded-xl border border-[#E3EAE5] bg-white px-4 py-3">
          <dt className="flex items-center gap-1.5 text-[11px] font-medium text-[#7A8A80] uppercase">
            <CalendarDays className="size-3" aria-hidden /> Échéance
          </dt>
          <dd className="mt-1 font-semibold text-[#22312A]">{request.day}</dd>
        </div>
        <div className="rounded-xl border border-[#E3EAE5] bg-white px-4 py-3">
          <dt className="flex items-center gap-1.5 text-[11px] font-medium text-[#7A8A80] uppercase">
            <Hash className="size-3" aria-hidden /> Référence
          </dt>
          <dd className="mt-1 font-semibold text-[#22312A]">#{request.id}</dd>
        </div>
      </dl>

      {/* Traitement : Reçue → En traitement → Terminée (spec §18). */}
      <ProcessingStepper status={status} />
    </div>
  );
}

function ProcessingStepper({ status }: { status: "recue" | "traitement" | "terminee" }) {
  const steps = [
    { id: "recue", label: "Reçue", done: true },
    { id: "traitement", label: "En traitement", done: status !== "recue" },
    { id: "terminee", label: "Terminée", done: status === "terminee" },
  ] as const;

  return (
    <div className="mt-auto">
      <p className="mb-3 text-[11px] font-semibold tracking-wide text-[#7A8A80] uppercase">
        Traitement
      </p>
      <div className="flex items-center gap-2" data-story-stepper>
        {steps.map((step, i) => (
          <div key={step.id} className="flex flex-1 items-center gap-2">
            <span
              className={`flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-semibold transition-colors duration-500 ${
                step.done
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-[#E3EAE5] bg-white text-[#A4B2A9]"
              }`}
            >
              {step.label}
            </span>
            {i < steps.length - 1 ? (
              <span
                className={`h-px flex-1 transition-colors duration-500 ${
                  steps[i + 1].done ? "bg-primary/40" : "bg-[#E3EAE5]"
                }`}
                aria-hidden
              />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
