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
    <Card className="relative overflow-hidden p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-1">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground">
            {title}
          </p>
          <p className="text-xl sm:text-2xl font-bold text-foreground">
            {value}
          </p>
        </div>
        <div
          className={cn(
            "flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg",
            iconBg,
          )}
        >
          <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((stat) => (
        <StatCard key={stat.title} {...stat} />
      ))}
    </div>
  );
}
