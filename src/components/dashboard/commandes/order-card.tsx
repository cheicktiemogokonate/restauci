"use client";

import { CustomAvatar } from "@/components/shared/avatar-fallback";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatPrix } from "@/lib/utils/format";
import { STATUT_TRANSITIONS } from "@/types/commandes";
import { CheckCircle, Clock, CreditCard, Eye, Truck, XCircle } from "lucide-react";
import { memo, useEffect, useState, useTransition } from "react";
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
  createdAt: string;
  status: OrderStatus;
  orderType: "Sur place" | "À emporter" | "Livraison";
  driverAssigned?: boolean;
  tableNumber?: string;
  articles: OrderArticle[];
  total: number;
}

interface OrderCardProps {
  order: Order;
  isUpdating?: boolean;
  onViewDetails?: (order: Order) => void;
  onCheckout?: (order: Order) => Promise<boolean>;
  onStatusChange?: (order: Order, status: OrderStatus) => Promise<boolean>;
}

function StatusIcon({ status }: { status: OrderStatus }) {
  switch (status) {
    case "prete":
      return <CheckCircle className="h-3.5 w-3.5" />;
    case "en_preparation":
      return <Clock className="h-3.5 w-3.5" />;
    case "annulee":
      return <XCircle className="h-3.5 w-3.5" />;
    default:
      return null;
  }
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
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
  );
}

type WaitTone = "normal" | "warning" | "critical";

function getWaitIndicator(
  createdAt: string,
  status: OrderStatus,
  now: number,
): { label: string; tone: WaitTone } | null {
  if (status === "servie" || status === "annulee") return null;

  const minutes = Math.max(
    0,
    Math.floor((now - new Date(createdAt).getTime()) / 60_000),
  );
  const elapsed = minutes < 1 ? "à l'instant" : `depuis ${minutes} min`;
  const label =
    status === "recue"
      ? `Reçue ${elapsed}`
      : status === "en_preparation"
        ? `En préparation ${elapsed}`
        : `Prête ${elapsed}`;

  const thresholds =
    status === "recue"
      ? { warning: 5, critical: 10 }
      : status === "en_preparation"
        ? { warning: 20, critical: 35 }
        : { warning: 10, critical: 20 };

  return {
    label,
    tone:
      minutes >= thresholds.critical
        ? "critical"
        : minutes >= thresholds.warning
          ? "warning"
          : "normal",
  };
}

export const OrderCard = memo(function OrderCard({
  order,
  isUpdating = false,
  onViewDetails,
  onCheckout,
  onStatusChange,
}: OrderCardProps) {
  const [isPending, startTransition] = useTransition();
  const isActionPending = isPending || isUpdating;
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  // L'état affiché vient toujours du serveur. L'ancien état optimiste pouvait
  // rester affiché après un échec réseau ou une transition concurrente.
  const statusConfig = getStatusConfig(order.status);
  const isCancelled = order.status === "annulee";
  const isReceived = order.status === "recue";
  const isPreparing = order.status === "en_preparation";
  const isReady = order.status === "prete";
  const isServed = order.status === "servie";
  const isDelivery = order.orderType === "Livraison";
  const waitIndicator = getWaitIndicator(order.createdAt, order.status, now);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  // Source unique de vérité pour les transitions valides : STATUT_TRANSITIONS (backend, @/types/commandes)
  const availableTransitions = STATUT_TRANSITIONS[order.status] ?? [];
  const canAccept =
    isReceived && availableTransitions.includes("en_preparation");
  const canReject = isReceived && availableTransitions.includes("annulee");
  const canMarkReady = isPreparing && availableTransitions.includes("prete");
  const canCheckout =
    isReady && !isDelivery && availableTransitions.includes("servie");
  // "servie" en livraison se ferme via confirmation client / délai auto (🔗 Passe 4), jamais par clic restaurateur
  const canCancelInProgress =
    (isPreparing || isReady) && availableTransitions.includes("annulee");

  const handleTransition = (target: OrderStatus) => {
    startTransition(async () => {
      await onStatusChange?.(order, target);
    });
  };

  const handleCancel = () => {
    setIsCancelDialogOpen(true);
  };

  const handleConfirmCancel = () => {
    setIsCancelDialogOpen(false);
    handleTransition("annulee");
  };

  const handleCheckout = () => {
    if (!onCheckout || !canCheckout) return;

    startTransition(async () => {
      // Encaisser clôture directement la commande : payée = servie (sur place / à emporter uniquement)
      await onCheckout(order);
    });
  };

  return (
    <>
      <Card className="overflow-hidden border border-border/60 hover:border-border transition-colors shadow-sm rounded-2xl">
      <CardContent className="p-5">
        {/* Date & Time */}
        <div className="flex items-center justify-between text-[13px] text-muted-foreground mb-3">
          <span>{order.date}</span>
          <div className="flex items-center gap-2">
            <span>{order.time}</span>
            {waitIndicator && (
              <Badge
                variant="outline"
                className={cn(
                  "h-6 gap-1 rounded-full px-2 text-[11px] font-medium",
                  waitIndicator.tone === "critical"
                    ? "border-destructive/30 bg-destructive/5 text-destructive"
                    : waitIndicator.tone === "warning"
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : "border-border bg-muted/40 text-muted-foreground",
                )}
              >
                <Clock className="h-3 w-3" />
                {waitIndicator.label}
              </Badge>
            )}
          </div>
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
              statusConfig.className,
            )}
          >
            <StatusIcon status={order.status} />
            {statusConfig.label}
          </Badge>
        </div>

        {/* ID & Type */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-sm font-semibold text-brand-green">
            {order.orderId}
          </span>
          <div className="flex items-center gap-2 text-xs">
            <Badge
              variant="outline"
              className="text-[11px] font-medium px-2 py-0.5 text-muted-foreground border-border/80 bg-muted/20"
            >
              {order.orderType}
            </Badge>
            {isDelivery && order.driverAssigned !== undefined && (
              order.driverAssigned ? (
                <Badge
                  variant="outline"
                  className="gap-1 border-brand-green/20 bg-brand-green/5 px-2 py-0.5 text-[11px] font-medium text-brand-green"
                >
                  <Truck className="h-3 w-3" />
                  Livreur assigné
                </Badge>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 gap-1 rounded-full border-amber-200 bg-amber-50 px-2 text-[11px] font-medium text-amber-700 hover:bg-amber-100 hover:text-amber-800"
                  onClick={() => onViewDetails?.(order)}
                >
                  <Truck className="h-3 w-3" />
                  Livreur à assigner
                </Button>
              )
            )}
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
          <span className="text-lg font-bold text-brand-green">
            {formatPrix(order.total)}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-4">
          {isReceived && (
            <>
              {canReject && (
                <Button
                  variant="outline"
                  size="lg"
                  className="flex-1 text-destructive"
                  disabled={isActionPending}
                  onClick={handleCancel}
                >
                  <XCircle className="h-4 w-4" />
                  Refuser
                </Button>
              )}
              {canAccept && (
                <Button
                  size="lg"
                  className="flex-1"
                  disabled={isActionPending}
                  onClick={() => handleTransition("en_preparation")}
                >
                  {isActionPending ? (
                    <span className="flex items-center gap-2">
                      <Spinner />
                      En cours...
                    </span>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Accepter
                    </>
                  )}
                </Button>
              )}
            </>
          )}

          {isPreparing && (
            <>
              <Button
                variant="outline"
                size="icon-lg"
                onClick={() => onViewDetails?.(order)}
              >
                <Eye className="h-4 w-4 text-muted-foreground" />
              </Button>
              {canCancelInProgress && (
                <Button
                  variant="destructive"
                  size="icon-lg"
                  aria-label="Annuler la commande"
                  disabled={isActionPending}
                  onClick={handleCancel}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              )}
              {canMarkReady && (
                <Button
                  size="lg"
                  className="flex-1"
                  disabled={isActionPending}
                  onClick={() => handleTransition("prete")}
                >
                  {isActionPending ? (
                    <span className="flex items-center gap-2">
                      <Spinner />
                      En cours...
                    </span>
                  ) : (
                    "Marquer prête"
                  )}
                </Button>
              )}
            </>
          )}

          {isReady && !isDelivery && (
            <>
              <Button
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={() => onViewDetails?.(order)}
              >
                <Eye className="h-4 w-4 text-muted-foreground" />
                Voir détails
              </Button>
              {canCancelInProgress && (
                <Button
                  variant="destructive"
                  size="icon-lg"
                  aria-label="Annuler la commande"
                  disabled={isActionPending}
                  onClick={handleCancel}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              )}
              {canCheckout && (
                <Button
                  size="lg"
                  className="flex-1"
                  disabled={isActionPending}
                  onClick={handleCheckout}
                >
                  {isActionPending ? (
                    <span className="flex items-center gap-2">
                      <Spinner />
                      En cours...
                    </span>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" />
                      Encaisser
                    </>
                  )}
                </Button>
              )}
            </>
          )}

          {isReady && isDelivery && (
            <>
              {/* 🔗 Passe 4 : action "Remise au livreur" en attente du champ backend remisAuLivreurAt */}
              <Button
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={() => onViewDetails?.(order)}
              >
                <Eye className="h-4 w-4 text-muted-foreground" />
                Voir détails
              </Button>
              {canCancelInProgress && (
                <Button
                  variant="destructive"
                  size="icon-lg"
                  aria-label="Annuler la commande"
                  disabled={isActionPending}
                  onClick={handleCancel}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              )}
            </>
          )}

          {(isServed || isCancelled) && (
            <Button
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={() => onViewDetails?.(order)}
            >
              <Eye className="h-4 w-4 text-muted-foreground" />
              Voir détails
            </Button>
          )}
        </div>
      </CardContent>
      </Card>
      <AlertDialog
        open={isCancelDialogOpen}
        onOpenChange={setIsCancelDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler cette commande ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette commande disparaîtra de la file de service et restera dans
              l&apos;historique comme annulée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Retour</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmer l&apos;annulation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});
