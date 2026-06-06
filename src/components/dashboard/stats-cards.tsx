"use client";

import { Card } from "@/components/ui/card";
import { ShoppingBag, Users, DollarSign, TrendingUp, TrendingDown, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  changeType: "positive" | "negative";
  // icon: React.ElementType;
  icon: LucideIcon;
  iconBg: string;
}

function StatCard({ title, value, change, changeType, icon: Icon, iconBg }: StatCardProps) {
  return (
    <Card className="relative overflow-hidden p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-1">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-xl sm:text-2xl font-bold text-foreground">{value}</p>
          <div className="flex items-center gap-1">
            {changeType === "positive" ? (
              <TrendingUp className="h-3 w-3 text-brand-green" />
            ) : (
              <TrendingDown className="h-3 w-3 text-destructive" />
            )}
            <span
              className={cn(
                "text-xs font-medium",
                changeType === "positive" ? "text-brand-green" : "text-destructive"
              )}
            >
              {change}
            </span>
          </div>
        </div>
        <div className={cn("flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg", iconBg)}>
          <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
        </div>
      </div>
    </Card>
  );
}

const stats: StatCardProps[] = [
  {
    title: "Total Orders",
    value: "852",
    change: "+852",
    changeType: "positive",
    icon: ShoppingBag,
    iconBg: "bg-brand-green",
  },
  {
    title: "Total Customers",
    value: "3,200",
    change: "+0.42%",
    changeType: "positive",
    icon: Users,
    iconBg: "bg-brand-green",
  },
  {
    title: "Total Revenue",
    value: "$45,860",
    change: "+5,330",
    changeType: "positive",
    icon: DollarSign,
    iconBg: "bg-brand-green",
  },
];

export function StatsCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {stats.map((stat) => (
        <StatCard key={stat.title} {...stat} />
      ))}
    </div>
  );
}
