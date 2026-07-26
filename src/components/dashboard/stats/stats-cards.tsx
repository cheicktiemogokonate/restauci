import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatPrix } from "@/lib/utils/format";
import type { StatsDashboard } from "@/types/dashboard";
import {
  CalendarRange,
  DollarSign,
  LucideIcon,
  ShoppingBag,
} from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  iconBg: string;
}

function StatCard({ title, value, icon: Icon, iconBg }: StatCardProps) {
  return (
    <Card className="relative overflow-hidden border border-border/60 p-3 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground/80 sm:text-xs">
            {title}
          </p>
          <p className="mt-1 text-lg font-bold leading-tight text-foreground sm:text-2xl">
            {value}
          </p>
        </div>
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-12 sm:w-12",
            iconBg,
          )}
        >
          <Icon className="h-4 w-4 text-white sm:h-5 sm:w-5" />
        </div>
      </div>
    </Card>
  );
}

export function StatsCards({ stats }: { stats: StatsDashboard }) {
  const cards: StatCardProps[] = [
    {
      title: "Commandes du jour",
      value: String(stats.commandesAujourdhui),
      icon: ShoppingBag,
      iconBg: "bg-brand-green",
    },
    {
      title: "Commandes du mois",
      value: String(stats.commandesMois),
      icon: CalendarRange,
      iconBg: "bg-brand-green",
    },
    {
      title: "CA du mois",
      value: formatPrix(stats.chiffreAffairesMois),
      icon: DollarSign,
      iconBg: "bg-brand-green",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
      {cards.map((stat) => (
        <StatCard key={stat.title} {...stat} />
      ))}
    </div>
  );
}
