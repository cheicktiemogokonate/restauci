"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export type OrderStatus = "ready" | "preparing" | "cancelled";

interface OrderFiltersProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  counts: {
    all: number;
    preparing: number;
    ready: number;
    cancelled: number;
  };
}

const filters = [
  { id: "all", label: "Toutes", countKey: "all" as const },
  { id: "preparing", label: "En préparation", countKey: "preparing" as const },
  { id: "ready", label: "Prêtes", countKey: "ready" as const },
  { id: "cancelled", label: "Annulées", countKey: "cancelled" as const },
];

export function OrderFilters({ activeFilter, onFilterChange, counts }: OrderFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {filters.map((filter) => {
        const isActive = activeFilter === filter.id;
        let badgeClass = "";
        
        if (isActive) {
          badgeClass = "bg-background text-brand-green";
        } else {
          switch (filter.id) {
            case "preparing":
              badgeClass = "bg-amber-100 text-amber-600";
              break;
            case "ready":
              badgeClass = "bg-[#e2f5e9] text-[#2d7d46]"; // Light green
              break;
            case "cancelled":
              badgeClass = "bg-gray-100 text-gray-500";
              break;
            default:
              badgeClass = "bg-gray-100 text-gray-500";
          }
        }

        return (
          <button
            key={filter.id}
            onClick={() => onFilterChange(filter.id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors border",
              isActive
                ? "bg-brand-green text-primary-foreground border-none"
                : "bg-background text-foreground border-border/60 hover:bg-muted/50 shadow-sm"
            )}
          >
            {filter.label}
            <Badge
              variant="secondary"
              className={cn(
                "h-6 min-w-6 px-1.5 text-[11px] rounded-full font-bold border-none shadow-none flex items-center justify-center",
                badgeClass
              )}
            >
              {counts[filter.countKey]}
            </Badge>
          </button>
        );
      })}
    </div>
  );
}

export function getStatusConfig(status: OrderStatus) {
  switch (status) {
    case "ready":
      return {
        label: "Prête",
        variant: "default" as const,
        className: "bg-[#e2f5e9] text-[#2d7d46] border-[#bfe8cd]",
        icon: "check",
      };
    case "preparing":
      return {
        label: "En préparation",
        variant: "secondary" as const,
        className: "bg-amber-50 text-amber-600 border-amber-200",
        icon: "clock",
      };
    case "cancelled":
      return {
        label: "Annulée",
        variant: "destructive" as const,
        className: "bg-red-50 text-red-500 border-red-200",
        icon: "x",
      };
    default:
      return {
        label: "Unknown",
        variant: "secondary" as const,
        className: "",
        icon: "help",
      };
  }
}
