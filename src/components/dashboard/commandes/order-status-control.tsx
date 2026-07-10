// components/dashboard/commandes/order-status-menu.tsx
"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { updateCommandeStatus } from "@/lib/actions/commandes";
import type { Commande } from "@/types";

type Statut = Commande["statut"];

// Basé sur le flux réel : recue -> en_preparation -> prete -> servie,
// annulee possible à tout moment sauf une fois servie.
const STATUS_FLOW: Record<Statut, Statut[]> = {
  recue: ["en_preparation", "annulee"],
  en_preparation: ["prete", "annulee"],
  prete: ["servie", "annulee"],
  servie: [],
  annulee: [],
};

const STATUS_LABELS: Record<Statut, string> = {
  recue: "Reçue",
  en_preparation: "En préparation",
  prete: "Prête",
  servie: "Servie",
  annulee: "Annulée",
};

interface OrderStatusMenuProps {
  commandeId: string;
  currentStatus: Statut;
}

export function OrderStatusMenu({
  commandeId,
  currentStatus,
}: OrderStatusMenuProps) {
  const [isPending, startTransition] = useTransition();
  const [pendingStatus, setPendingStatus] = useState<Statut | null>(null);

  const nextOptions = STATUS_FLOW[currentStatus] ?? [];
  if (nextOptions.length === 0) return null;

  const handleSelect = (statut: Statut) => {
    // Confirmation uniquement pour l'annulation, qui est destructive.
    if (statut === "annulee") {
      setPendingStatus(statut);
      return;
    }
    startTransition(async () => {
      await updateCommandeStatus(commandeId, statut);
    });
  };

  const handleConfirmCancel = () => {
    if (!pendingStatus) return;
    startTransition(async () => {
      await updateCommandeStatus(commandeId, pendingStatus);
      setPendingStatus(null);
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="gap-2 h-10 rounded-xl text-sm font-semibold border-border/80 text-foreground"
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Plus d&apos;actions
                <ChevronDown className="h-4 w-4" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {nextOptions.map((option) => (
            <DropdownMenuItem
              key={option}
              onSelect={() => handleSelect(option)}
              className={
                option === "annulee" ? "text-red-600 focus:text-red-600" : ""
              }
            >
              {STATUS_LABELS[option]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={pendingStatus !== null}
        onOpenChange={(open) => !open && setPendingStatus(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler cette commande ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est définitive et ne peut pas être annulée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Retour</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              className="bg-red-600 hover:bg-red-700"
            >
              Confirmer l'annulation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}