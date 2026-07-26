"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/motion/tabs";
import { cn } from "@/lib/utils";

export type OrderStatus =
  | "recue"
  | "en_preparation"
  | "prete"
  | "servie"
  | "annulee";

interface OrderFiltersProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  counts: {
    all: number;
    en_cours: number;
    recue: number;
    en_preparation: number;
    prete: number;
    servie: number;
    annulee: number;
  };
}

const filters = [
  { id: "en_cours", label: "Service en cours", countKey: "en_cours" as const },
  { id: "all", label: "Toutes", countKey: "all" as const },
  { id: "recue", label: "Reçues", countKey: "recue" as const },
  {
    id: "en_preparation",
    label: "En préparation",
    countKey: "en_preparation" as const,
  },
  { id: "prete", label: "Prêtes", countKey: "prete" as const },
  { id: "servie", label: "Servies", countKey: "servie" as const },
  { id: "annulee", label: "Annulées", countKey: "annulee" as const },
];

export function OrderFilters({
  activeFilter,
  onFilterChange,
  counts,
}: OrderFiltersProps) {
  return (
    <Tabs
      value={activeFilter}
      onValueChange={onFilterChange}
      variant="underline"
      className="w-full min-w-0"
    >
      <div className="w-full overflow-x-auto">
        <TabsList className="h-11 min-w-max w-full justify-start gap-0">
          {filters.map((filter) => {
            const isActive = activeFilter === filter.id;
            const badgeClass = isActive
              ? "bg-brand-green text-white"
              : "bg-muted text-muted-foreground";

            return (
              <TabsTrigger
                key={filter.id}
                value={filter.id}
                className={cn(
                  "h-11 shrink-0 gap-2 px-3.5 text-sm",
                  isActive
                    ? "font-semibold text-brand-green"
                    : "text-muted-foreground hover:text-foreground",
                )}
                indicatorClassName="h-0.5 bg-brand-green"
              >
                <span className="whitespace-nowrap">{filter.label}</span>
                <Badge
                  variant="secondary"
                  className={cn(
                    "flex h-5 min-w-5 items-center justify-center rounded-full border-none px-1.5 text-[11px] font-semibold shadow-none",
                    badgeClass,
                  )}
                >
                  {counts[filter.countKey]}
                </Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </div>
    </Tabs>
  );
}

export function getStatusConfig(status: OrderStatus) {
  switch (status) {
    case "recue":
      return {
        label: "Reçue",
        variant: "secondary" as const,
        className: "bg-gray-50 text-gray-600 border-gray-200",
        icon: "inbox",
      };
    case "en_preparation":
      return {
        label: "En préparation",
        variant: "secondary" as const,
        className: "bg-amber-50 text-amber-600 border-amber-200",
        icon: "clock",
      };
    case "prete":
      return {
        label: "Prête",
        variant: "default" as const,
        className: "bg-brand-green/10 text-brand-green border-brand-green/30",
        icon: "check",
      };
    case "servie":
      return {
        label: "Servie",
        variant: "secondary" as const,
        className: "bg-gray-50 text-gray-600 border-gray-200",
        icon: "check-check",
      };
    case "annulee":
      return {
        label: "Annulée",
        variant: "destructive" as const,
        className: "bg-red-50 text-red-500 border-red-200",
        icon: "x",
      };
    default:
      return {
        label: "Inconnue",
        variant: "secondary" as const,
        className: "",
        icon: "help",
      };
  }
}
