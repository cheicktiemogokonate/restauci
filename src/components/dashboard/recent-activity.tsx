"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardList, Calendar, AlertTriangle, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Activity {
  id: string;
  // icon: React.ElementType;
  icon: LucideIcon;
  iconBg: string;
  title: string;
  subtitle?: string;
  time: string;
  badge?: {
    text: string;
    variant: "default" | "warning" | "success";
  };
}

const activities: Activity[] = [
  {
    id: "1",
    icon: ClipboardList,
    iconBg: "bg-primary/10",
    title: "Nouvelle Commande:",
    subtitle: "Garba complet x3",
    time: "12s ago",
  },
  {
    id: "2",
    icon: Calendar,
    iconBg: "bg-blue-500/10",
    title: "Table 14 Réservation",
    subtitle: "Confirmée",
    time: "2m ago",
  },
  {
    id: "3",
    icon: AlertTriangle,
    iconBg: "bg-orange-500/10",
    title: "Inventory Alert:",
    subtitle: "Saffron Stock Low",
    time: "15m ago",
    badge: {
      text: "LOW",
      variant: "warning",
    },
  },
];

const badgeStyles = {
  default: "bg-primary text-primary-foreground",
  warning: "bg-orange-500 text-white",
  success: "bg-emerald-500 text-white",
};

export function RecentActivity() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
        <Button variant="link" className="text-xs text-muted-foreground p-0 h-auto">
          ...
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-3">
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0",
                activity.iconBg
              )}
            >
              <activity.icon
                className={cn(
                  "h-4 w-4",
                  activity.iconBg.includes("primary")
                    ? "text-primary"
                    : activity.iconBg.includes("blue")
                    ? "text-blue-500"
                    : "text-orange-500"
                )}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-foreground">{activity.title}</p>
                  {activity.subtitle && (
                    <p className="text-xs text-muted-foreground">{activity.subtitle}</p>
                  )}
                </div>
                {activity.badge && (
                  <span
                    className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded",
                      badgeStyles[activity.badge.variant]
                    )}
                  >
                    {activity.badge.text}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
