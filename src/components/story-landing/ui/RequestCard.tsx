"use client";

import { AnimatedBadge } from "@/components/motion/animated-badge";
import { cn } from "@/shared/ui/cn";

export type RequestCardStatus =
  | "confirmee"
  | "nouvelle"
  | "traitement"
  | "terminee";

const STATUS_LABEL: Record<RequestCardStatus, string> = {
  confirmee: "Confirmée",
  nouvelle: "Nouvelle",
  traitement: "En traitement",
  terminee: "Terminée",
};

const STATUS_VARIANT: Record<
  RequestCardStatus,
  "info" | "loading" | "success" | "neutral"
> = {
  confirmee: "success",
  nouvelle: "info",
  traitement: "loading",
  terminee: "success",
};

export interface RequestCardProps {
  id: string;
  amountLabel: string;
  status: RequestCardStatus;
  size?: "sm" | "md";
  className?: string;
  /** React 19 : ref transmise pour les mesures GSAP (vol de la carte). */
  ref?: React.Ref<HTMLDivElement>;
}

/**
 * Carte « Demande » — objet narratif central de la landing (spec §11).
 * Utilisée dans l'iPhone, la vue Demandes de Safari et la vue détail.
 */
export function RequestCard({
  id,
  amountLabel,
  status,
  size = "md",
  className,
  ref,
}: RequestCardProps) {
  return (
    <div
      ref={ref}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-2xl border border-[#E3EAE5] bg-white",
        size === "md" ? "p-4" : "px-3 py-2.5",
        className,
      )}
    >
      <div className="min-w-0">
        <p
          className={cn(
            "truncate font-semibold text-[#22312A]",
            size === "md" ? "text-sm" : "text-xs",
          )}
        >
          #{id}
        </p>
        <p
          className={cn(
            "font-bold text-primary",
            size === "md" ? "text-lg" : "text-sm",
          )}
        >
          {amountLabel}
        </p>
      </div>
      <AnimatedBadge
        status={STATUS_VARIANT[status]}
        size="sm"
        className="shrink-0"
        aria-label={STATUS_LABEL[status]}
      >
        {STATUS_LABEL[status]}
      </AnimatedBadge>
    </div>
  );
}
