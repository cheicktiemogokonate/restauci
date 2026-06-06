"use client";

import { Printer, MoreHorizontal, RefreshCw, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface OrderDetailsHeaderProps {
  orderId: string;
  status: "en_cours" | "prete" | "annulee" | "livree";
  date: string;
  time: string;
  orderType: "en_ligne" | "sur_place" | "a_emporter";
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
}: OrderDetailsHeaderProps) {
  const statusInfo = statusConfig[status];

  return (
    <Card className="border border-border/60 shadow-sm rounded-2xl overflow-hidden">
      <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-[22px] font-bold text-foreground">Commande {orderId}</h2>
            <Badge
              variant="outline"
              className={`flex items-center gap-1.5 font-medium px-2.5 py-0.5 rounded-full ${statusInfo.className}`}
            >
              <RefreshCw className="h-3 w-3" />
              {statusInfo.label}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-[14px] text-muted-foreground mt-1.5">
            <p>Passée le {date} à {time}</p>
            <span className="flex items-center gap-1 text-[#2d7d46] font-medium ml-2">
              <Smartphone className="h-3.5 w-3.5" />
              {orderTypeLabels[orderType]}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2 h-10 rounded-xl text-sm font-semibold border-border/80 text-foreground">
            <Printer className="h-4 w-4" />
            Imprimer
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 h-10 rounded-xl text-sm font-semibold border-border/80 text-foreground">
                Plus d&apos;actions
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl">
              <DropdownMenuItem>Modifier la commande</DropdownMenuItem>
              <DropdownMenuItem>Annuler la commande</DropdownMenuItem>
              <DropdownMenuItem>Rembourser</DropdownMenuItem>
              <DropdownMenuItem>Contacter le client</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
