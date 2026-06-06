"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Check, Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrackingStep {
  id: string;
  label: string;
  date: string;
  time: string;
  completed: boolean;
  current?: boolean;
}

interface OrderTrackingProps {
  steps: TrackingStep[];
}

export function OrderTracking({ steps }: OrderTrackingProps) {
  return (
    <Card className="border border-border/60 shadow-sm rounded-2xl">
      <CardHeader className="flex flex-row items-center justify-between pb-4 pt-6">
        <CardTitle className="text-[16px] font-bold">
          Suivi de la commande
        </CardTitle>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="relative pt-2">
          {steps.map((step, index) => (
            <div key={step.id} className="flex gap-4 pb-8 last:pb-0">
              {/* Time Info */}
              <div className="w-[85px] shrink-0 pt-0.5 text-left">
                {(step.completed || step.current) && (
                  <p className="text-[12px] text-muted-foreground leading-tight">
                    {step.date}
                    <br />
                    {step.time}
                  </p>
                )}
              </div>

              {/* Timeline */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "h-[26px] w-[26px] rounded-full flex items-center justify-center z-10 bg-white",
                    step.completed
                      ? "bg-[#2d7d46] text-white"
                      : step.current
                      ? "border-[2px] border-[#2d7d46] text-[#2d7d46]"
                      : "bg-[#f3f4f6] text-[#9ca3af]"
                  )}
                >
                  {step.completed ? (
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  ) : step.current ? (
                    <Package className="h-3.5 w-3.5" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "w-[2px] -mb-8 -mt-1 h-full",
                      step.completed ? "bg-[#2d7d46]" : "bg-[#f3f4f6]"
                    )}
                  />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pt-1.5">
                <p
                  className={cn(
                    "font-medium text-[14px]",
                    !step.completed && !step.current && "text-muted-foreground"
                  )}
                >
                  {step.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
