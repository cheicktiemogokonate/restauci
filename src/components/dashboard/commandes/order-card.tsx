"use client";

import { CustomAvatar } from "@/components/shared/avatar-fallback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatPrix } from "@/lib/utils/format";
import {
  CheckCircle,
  Clock,
  CreditCard,
  Eye,
  Lock,
  XCircle,
} from "lucide-react";
import { memo, useOptimistic, useTransition } from "react";
import { OrderStatus, getStatusConfig } from "./order-filters";

export interface OrderArticle {
  id: string;
  name: string;
  quantity: number;
  price: number;
  image?: string | null;
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

/** Transitions de statut autorisées côté UI */
const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  preparing: "ready",
};

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

export const OrderCard = memo(function OrderCard({
  order,
  onViewDetails,
  onCheckout,
}: OrderCardProps) {
  const [isPending, startTransition] = useTransition();
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(order.status);

  const statusConfig = getStatusConfig(optimisticStatus);
  const isCancelled = optimisticStatus === "cancelled";
  const nextStatus = NEXT_STATUS[optimisticStatus];

  const handleCheckout = () => {
    if (!onCheckout || isCancelled) return;

    startTransition(async () => {
      // 1. Mise à jour optimiste IMMÉDIATE (badge change avant réponse serveur)
      if (nextStatus) setOptimisticStatus(nextStatus);
      // 2. Appel du handler parent (qui appelle l'API et met à jour le state)
      onCheckout(order);
    });
  };

  return (
    <Card className="overflow-hidden border border-border/60 hover:border-border transition-colors shadow-sm rounded-2xl">
      <CardContent className="p-5">
        {/* Date & Time */}
        <div className="flex items-center justify-between text-[13px] text-muted-foreground mb-3">
          <span>{order.date}</span>
          <span>{order.time}</span>
        </div>

        {/* Name & Status — utilise optimisticStatus pour afficher immédiatement */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold text-foreground tracking-tight">
            {order.customerName}
          </h3>
          <Badge
            variant="outline"
            className={cn(
              "gap-1.5 font-medium text-xs px-2.5 py-0.5 rounded-full",
              statusConfig.className,
            )}
          >
            <StatusIcon status={optimisticStatus} />
            {statusConfig.label}
          </Badge>
        </div>

        {/* ID & Type */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-sm font-semibold text-[#2d7d46]">
            {order.orderId}
          </span>
          <div className="flex items-center gap-2 text-xs">
            <Badge
              variant="outline"
              className="text-[11px] font-medium px-2 py-0.5 text-muted-foreground border-border/80 bg-muted/20"
            >
              {order.orderType}
            </Badge>
            {order.tableNumber && (
              <Badge
                variant="outline"
                className="text-[11px] font-medium px-2 py-0.5 text-muted-foreground border-border/80 bg-muted/20"
              >
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
                <div className="relative h-11 w-11 rounded-lg overflow-hidden shrink-0 border border-border/50">
                  <CustomAvatar
                    src={article.image}
                    alt={article.name}
                    className="h-full w-full rounded-none"
                  />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-[13px] font-semibold text-foreground truncate leading-tight mb-1">
                    {article.name}
                  </p>
                  <p className="text-[13px] text-muted-foreground">
                    x{article.quantity}
                  </p>
                </div>
                <p className="text-[13px] font-medium text-foreground pt-0.5">
                  {formatPrix(article.price)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="flex items-center justify-between pt-4 pb-2 border-t border-border/60">
          <span className="text-[15px] font-bold text-foreground">Total</span>
          <span className="text-lg font-bold text-[#2d7d46]">
            {formatPrix(order.total)}
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
              isCancelled &&
                "bg-muted text-muted-foreground hover:bg-muted cursor-not-allowed border-none shadow-none",
            )}
            disabled={isCancelled || isPending}
            onClick={handleCheckout}
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                En cours...
              </span>
            ) : isCancelled ? (
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
});
