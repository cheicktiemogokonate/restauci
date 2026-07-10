"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Printer, RefreshCw, Smartphone } from "lucide-react";
import React from "react";

export interface OrderDetailsHeaderProps {
  orderId: string;
  status: "en_cours" | "prete" | "annulee" | "livree";
  date: string;
  time: string;
  orderType: "en_ligne" | "sur_place" | "a_emporter";
  onPrint?: () => void;
  actions?: React.ReactNode;
}

const statusConfig = {
  en_cours: {
    label: "En cours",
    className: "bg-[#e2f5e9] text-[#2d7d46] border-[#bfe8cd]",
  },
  prete: {
    label: "Prête",
    className: "bg-[#e2f5e9] text-[#2d7d46] border-[#bfe8cd]",
  },
  annulee: {
    label: "Annulée",
    className: "bg-red-50 text-red-700 border-red-200",
  },
  livree: {
    label: "Livrée",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
};

const orderTypeLabels = {
  en_ligne: "En ligne",
  sur_place: "Sur place",
  a_emporter: "À emporter",
};

export function OrderDetailsHeader({
  orderId,
  status,
  date,
  time,
  orderType,
  onPrint,
  actions,
}: OrderDetailsHeaderProps) {
  const statusInfo = statusConfig[status] || statusConfig.en_cours;

  return (
    <Card className="rounded-xl overflow-hidden w-full">
      <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 lg:p-6">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-foreground">
              Commande {orderId}
            </h2>
            <Badge
              variant="outline"
              className={`flex items-center gap-1.5 font-medium px-2.5 py-0.5 rounded-full ${statusInfo.className}`}
            >
              <RefreshCw className="h-3 w-3" />
              {statusInfo.label}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-[14px] text-muted-foreground mt-1.5">
            <p>
              Passée le {date} à {time}
            </p>
            <span className="flex items-center gap-1 text-[#2d7d46] font-medium ml-2">
              <Smartphone className="h-3.5 w-3.5" />
              {orderTypeLabels[orderType]}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {actions}
          <Button
            variant="outline"
            className="gap-2 h-10 rounded-xl text-sm font-semibold border-border/80 text-foreground"
            onClick={() => onPrint?.()}
          >
            <Printer className="h-4 w-4" />
            Imprimer le reçu
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
