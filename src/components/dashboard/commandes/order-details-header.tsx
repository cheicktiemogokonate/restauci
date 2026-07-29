"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Armchair,
  MapPin,
  PackageCheck,
  Printer,
  RefreshCw,
  Smartphone,
} from "lucide-react";
import React from "react";
import type { StatutCommande } from "@/lib/db/types";

export interface OrderDetailsHeaderProps {
  orderId: string;
  status: StatutCommande;
  date: string;
  time: string;
  orderType: "en_ligne" | "sur_place" | "a_emporter";
  serviceContext: string;
  onPrint?: () => void;
  actions?: React.ReactNode;
}

const statusConfig = {
  recue: {
    label: "À traiter",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  en_preparation: {
    label: "En préparation",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  prete: {
    label: "Prête",
    className: "bg-[#e2f5e9] text-[#2d7d46] border-[#bfe8cd]",
  },
  annulee: {
    label: "Annulée",
    className: "bg-red-50 text-red-700 border-red-200",
  },
  servie: {
    label: "Terminée",
    className: "bg-muted text-muted-foreground border-border",
  },
};

const orderTypeLabels = {
  en_ligne: "Livraison",
  sur_place: "Sur place",
  a_emporter: "À emporter",
};

export function OrderDetailsHeader({
  orderId,
  status,
  date,
  time,
  orderType,
  serviceContext,
  onPrint,
  actions,
}: OrderDetailsHeaderProps) {
  const statusInfo = statusConfig[status];
  const ServiceIcon =
    orderType === "sur_place"
      ? Armchair
      : orderType === "a_emporter"
        ? PackageCheck
        : MapPin;

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
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-muted-foreground">
            <p>
              Passée le {date} à {time}
            </p>
            <span className="flex items-center gap-1 font-medium text-[#2d7d46]">
              <Smartphone className="h-3.5 w-3.5" />
              {orderTypeLabels[orderType]}
            </span>
            <span className="flex items-center gap-1 text-foreground">
              <ServiceIcon className="h-3.5 w-3.5 text-muted-foreground" />
              {serviceContext}
            </span>
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
          {actions}
          {status !== "annulee" && (
            <Button
              variant="outline"
              className="h-10 w-full gap-2 rounded-xl border-border/80 text-sm font-semibold text-foreground sm:w-auto"
              onClick={() => onPrint?.()}
            >
              <Printer className="h-4 w-4" />
              Imprimer le reçu
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
