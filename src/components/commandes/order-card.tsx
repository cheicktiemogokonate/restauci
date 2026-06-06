"use client";

import Image from "next/image";
import { Eye, CreditCard, Lock, CheckCircle, Clock, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { OrderStatus, getStatusConfig } from "./order-filters";

export interface OrderArticle {
  id: string;
  name: string;
  quantity: number;
  price: number;
  image: string;
}

export interface Order {
  id: string;
  orderId: string;
  customerName: string;
  date: string;
  time: string;
  status: OrderStatus;
  orderType: "Sur place" | "À emporter" | "Livraison";
  tableNumber?: string;
  articles: OrderArticle[];
  total: number;
}

interface OrderCardProps {
  order: Order;
  onViewDetails?: (order: Order) => void;
  onCheckout?: (order: Order) => void;
}

function StatusIcon({ status }: { status: OrderStatus }) {
  switch (status) {
    case "ready":
      return <CheckCircle className="h-3.5 w-3.5" />;
    case "preparing":
      return <Clock className="h-3.5 w-3.5" />;
    case "cancelled":
      return <XCircle className="h-3.5 w-3.5" />;
    default:
      return null;
  }
}

export function OrderCard({ order, onViewDetails, onCheckout }: OrderCardProps) {
  const statusConfig = getStatusConfig(order.status);
  const isCancelled = order.status === "cancelled";

  return (
    <Card className="overflow-hidden border border-border/60 hover:border-border transition-colors shadow-sm rounded-2xl">
      <CardContent className="p-5">
        {/* Date & Time */}
        <div className="flex items-center justify-between text-[13px] text-muted-foreground mb-3">
          <span>{order.date}</span>
          <span>{order.time}</span>
        </div>

        {/* Name & Status */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold text-foreground tracking-tight">
            {order.customerName}
          </h3>
          <Badge
            variant="outline"
            className={cn(
              "gap-1.5 font-medium text-xs px-2.5 py-0.5 rounded-full",
              statusConfig.className
            )}
          >
            <StatusIcon status={order.status} />
            {statusConfig.label}
          </Badge>
        </div>

        {/* ID & Type */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-sm font-semibold text-[#2d7d46]">{order.orderId}</span>
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="outline" className="text-[11px] font-medium px-2 py-0.5 text-muted-foreground border-border/80 bg-muted/20">
              {order.orderType}
            </Badge>
            {order.tableNumber && (
              <Badge variant="outline" className="text-[11px] font-medium px-2 py-0.5 text-muted-foreground border-border/80 bg-muted/20">
                Table {order.tableNumber}
              </Badge>
            )}
          </div>
        </div>

        {/* Articles */}
        <div className="mb-6">
          <p className="text-sm font-bold text-foreground mb-4">Articles</p>
          <div className="space-y-4">
            {order.articles.map((article) => (
              <div key={article.id} className="flex items-start gap-3">
                <div className="relative h-11 w-11 rounded-lg overflow-hidden bg-muted flex-shrink-0 border border-border/50">
                  <Image
                    src={article.image}
                    alt={article.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-[13px] font-semibold text-foreground truncate leading-tight mb-1">
                    {article.name}
                  </p>
                  <p className="text-[13px] text-muted-foreground">x{article.quantity}</p>
                </div>
                <p className="text-[13px] font-medium text-foreground pt-0.5">
                  {article.price.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="flex items-center justify-between pt-4 pb-2 border-t border-border/60">
          <span className="text-[15px] font-bold text-foreground">Total</span>
          <span className="text-lg font-bold text-[#2d7d46]">
            {order.total.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-4">
          <Button
            variant="outline"
            className="flex-1 gap-2 rounded-xl text-sm font-semibold h-10 border-border/80"
            onClick={() => onViewDetails?.(order)}
          >
            <Eye className="h-4 w-4 text-muted-foreground" />
            Voir détails
          </Button>
          <Button
            className={cn(
              "flex-1 gap-2 rounded-xl text-sm font-semibold h-10 text-white bg-[#2d7d46] hover:bg-[#2d7d46]/90",
              isCancelled && "bg-muted text-muted-foreground hover:bg-muted cursor-not-allowed border-none shadow-none"
            )}
            disabled={isCancelled}
            onClick={() => onCheckout?.(order)}
          >
            {isCancelled ? (
              <>
                <Lock className="h-4 w-4" />
                Encaisser
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4" />
                Encaisser
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
