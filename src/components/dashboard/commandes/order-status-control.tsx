// components/dashboard/commandes/order-status-control.tsx
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
import { STATUT_LABELS, STATUT_TRANSITIONS } from "@/types/commandes";
import type { StatutCommande } from "@/lib/db/types";

type Statut = StatutCommande;

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

  const nextOptions = STATUT_TRANSITIONS[currentStatus] ?? [];
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
              {STATUT_LABELS[option]}
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
              Confirmer l&apos;annulation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
