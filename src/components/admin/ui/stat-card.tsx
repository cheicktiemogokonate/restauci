import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  valueSuffix?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  variant?: "default" | "success" | "warning" | "danger" | "info";
}

export function StatCard({ title, value, valueSuffix, icon: Icon, trend, variant = "default" }: StatCardProps) {
  const bgColors = {
    default: "bg-muted text-muted-foreground",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    danger: "bg-rose-50 text-rose-700",
    info: "bg-blue-50 text-blue-700",
  };

  return (
    <Card className="shadow-none">
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="mb-1 text-sm font-medium leading-5 text-muted-foreground">
            {title}
          </p>
          <p className="text-2xl font-semibold tracking-tight text-foreground">
            {typeof value === "number" ? (
              <AnimatedNumber
                value={value}
                locale="fr-FR"
                suffix={valueSuffix}
              />
            ) : (
              value
            )}
          </p>
          {trend && (
            <p className={`mt-1 text-xs ${trend.value >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {trend.value >= 0 ? '+' : ''}{trend.value}% <span className="text-gray-400">{trend.label}</span>
            </p>
          )}
        </div>
        <div className={`rounded-lg p-2.5 ${bgColors[variant]}`}>
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}
