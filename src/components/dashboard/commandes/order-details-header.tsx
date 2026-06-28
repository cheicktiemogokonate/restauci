"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Loader2,
  MoreHorizontal,
  Printer,
  RefreshCw,
  Smartphone,
} from "lucide-react";
import { useState } from "react";

export interface OrderDetailsHeaderProps {
  orderId: string;
  status: "en_cours" | "prete" | "annulee" | "livree";
  date: string;
  time: string;
  orderType: "en_ligne" | "sur_place" | "a_emporter";
  onStatusChanged?: (newStatus: string) => void;
  onPrint?: () => void;
}

const statusConfig = {
  en_cours: {
    label: "En cours",
    className: "bg-[#e2f5e9] text-[#2d7d46] border-[#bfe8cd]",
    dbStatus: "en_preparation",
  },
  prete: {
    label: "Prête",
    className: "bg-[#e2f5e9] text-[#2d7d46] border-[#bfe8cd]",
    dbStatus: "prete",
  },
  annulee: {
    label: "Annulée",
    className: "bg-red-50 text-red-700 border-red-200",
    dbStatus: "annulee",
  },
  livree: {
    label: "Livrée",
    className: "bg-blue-50 text-blue-700 border-blue-200",
    dbStatus: "servie",
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
  onStatusChanged,
  onPrint,
}: OrderDetailsHeaderProps) {
  const statusInfo = statusConfig[status];
  const [loading, setLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: "cancel" | "mark-ready" | "mark-served" | "refund" | null;
    title: string;
    description: string;
  } | null>(null);

  const updateStatus = async (
    newStatus: "recue" | "en_preparation" | "prete" | "servie" | "annulee",
  ) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/commandes/${orderId}/statut`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut: newStatus }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de la mise à jour");
      }

      const data = await response.json();
      onStatusChanged?.(newStatus);
      setConfirmAction(null);
      // Optional: Show success toast
    } catch (error) {
      console.error("Erreur:", error);
      // Optional: Show error toast
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = () => {
    setConfirmAction({
      type: "cancel",
      title: "Annuler la commande",
      description: "Êtes-vous sûr ? Cette action est irréversible.",
    });
  };

  const handleMarkReady = () => {
    setConfirmAction({
      type: "mark-ready",
      title: "Marquer comme prête",
      description:
        "La commande sera marquée comme prête à être livrée/retirée.",
    });
  };

  const handleMarkServed = () => {
    setConfirmAction({
      type: "mark-served",
      title: "Marquer comme servie",
      description: "Confirmez que la commande a été servie/livrée.",
    });
  };

  const handleConfirmAction = async () => {
    if (!confirmAction?.type) return;

    switch (confirmAction.type) {
      case "cancel":
        await updateStatus("annulee");
        break;
      case "mark-ready":
        await updateStatus("prete");
        break;
      case "mark-served":
        await updateStatus("servie");
        break;
      case "refund":
        // Handle refund separately if needed
        break;
    }
  };

  const getNextActions = () => {
    const actions = [];

    if (status === "en_cours") {
      actions.push({
        label: "Marquer comme prête",
        onClick: handleMarkReady,
        variant: "default" as const,
      });
    }

    if (status !== "livree" && status !== "annulee") {
      actions.push({
        label: "Annuler la commande",
        onClick: handleCancelOrder,
        variant: "destructive" as const,
      });
    }

    if (status === "prete") {
      actions.push({
        label: "Marquer comme servie",
        onClick: handleMarkServed,
        variant: "default" as const,
      });
    }

    return actions;
  };

  const availableActions = getNextActions();

  return (
    <>
      <Card className="rounded-xl overflow-hidden">
        <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  disabled={loading || availableActions.length === 0}
                  className="gap-2 h-10 rounded-xl text-sm font-semibold border-border/80 text-foreground"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Chargement...
                    </>
                  ) : (
                    <>
                      Plus d'actions
                      <MoreHorizontal className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl">
                {availableActions.length > 0 ? (
                  availableActions.map((action) => (
                    <DropdownMenuItem
                      key={action.label}
                      onClick={action.onClick}
                      disabled={loading}
                      className={
                        action.variant === "destructive"
                          ? "text-red-600 focus:text-red-600 focus:bg-red-50"
                          : ""
                      }
                    >
                      {action.label}
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled>
                    Aucune action disponible
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
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

      <AlertDialog
        open={confirmAction !== null}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <AlertDialogContent>
          <div className="space-y-4">
            <div>
              <AlertDialogTitle>{confirmAction?.title}</AlertDialogTitle>
              <AlertDialogDescription>
                {confirmAction?.description}
              </AlertDialogDescription>
            </div>
            <div className="flex justify-end gap-3">
              <AlertDialogCancel disabled={loading}>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmAction}
                disabled={loading}
                className={
                  confirmAction?.type === "cancel"
                    ? "bg-red-600 hover:bg-red-700"
                    : ""
                }
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Confirmer
              </AlertDialogAction>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
