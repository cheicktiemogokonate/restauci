import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Check, MoreHorizontal, Package, XCircle } from "lucide-react";
import type { StatutCommande } from "@/lib/db/types";

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
  status: StatutCommande;
}

export function OrderTracking({ steps, status }: OrderTrackingProps) {
  const isCancelled = status === "annulee";
  return (
    <Card className="border border-border/60 shadow-sm rounded-2xl">
      <CardHeader className="flex flex-row items-center justify-between pb-4 pt-6">
        <CardTitle className="text-[16px] font-bold">
          Suivi de la commande
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {isCancelled && (
          <Alert variant="destructive" className="mb-5 border-destructive/30 bg-destructive/5">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Commande annulée</AlertTitle>
            <AlertDescription>
              Le parcours s&apos;est arrêté avant sa finalisation.
            </AlertDescription>
          </Alert>
        )}
        <div className="relative pt-2">
          {steps.map((step, index) => (
            <div key={step.id} className="flex gap-4 pb-8 last:pb-0">
              {/* Time Info */}
              <div className="w-24 shrink-0 pt-0.5 text-left">
                {(step.completed || step.current) && (
                  <p className={cn(
                    "text-[12px] leading-tight",
                    step.current ? "font-semibold text-foreground" : "text-muted-foreground",
                  )}>
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
                    "h-6.5 w-6.5 rounded-full flex items-center justify-center z-10 bg-white",
                    step.completed
                      ? "bg-[#2d7d46] text-white"
                      : step.current
                        ? "border-2 border-[#2d7d46] text-[#2d7d46]"
                        : "bg-[#f3f4f6] text-[#9ca3af]",
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
                      "w-0.5 -mb-8 -mt-1 h-full",
                      step.completed ? "bg-[#2d7d46]" : "bg-[#f3f4f6]",
                    )}
                  />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pt-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p
                    className={cn(
                      "font-medium text-[14px]",
                      !step.completed && !step.current && "text-muted-foreground",
                    )}
                  >
                    {step.label}
                  </p>
                  {step.current && (
                    <Badge className="h-5 rounded-full bg-brand-green/10 px-2 text-[10px] font-semibold text-brand-green hover:bg-brand-green/10">
                      Étape en cours
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
