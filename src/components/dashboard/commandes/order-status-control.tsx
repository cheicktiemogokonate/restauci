// components/dashboard/commandes/order-status-control.tsx
"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, ChevronDown, Loader2 } from "lucide-react";
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
import { toast } from "sonner";
import { useRouter } from "next/navigation";


type Statut = StatutCommande;

interface OrderStatusMenuProps {
  commandeId: string;
  currentStatus: Statut;
  modeCommande?: "sur_place" | "emporter" | "livraison";
}

export function OrderStatusMenu({
  commandeId,
  currentStatus,
  modeCommande,
}: OrderStatusMenuProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingStatus, setPendingStatus] = useState<Statut | null>(null);

  const nextOptions = (STATUT_TRANSITIONS[currentStatus] ?? []).filter(
    (statut) => !(modeCommande === "livraison" && statut === "servie"),
  );
  if (nextOptions.length === 0) return null;

  const primaryStatus = nextOptions.find((statut) => statut !== "annulee");
  const primaryLabel: Partial<Record<Statut, string>> = {
    en_preparation: "Accepter et préparer",
    prete: "Marquer prête",
    servie: "Encaisser et terminer",
  };

  const handleSelect = (statut: Statut) => {
    // Confirmation uniquement pour l'annulation, qui est destructive.
    if (statut === "annulee") {
      setPendingStatus(statut);
      return;
    }
    startTransition(async () => {
      try {
        await updateCommandeStatus(commandeId, statut);
        toast.success(`Commande ${STATUT_LABELS[statut].toLocaleLowerCase("fr-FR")}.`);
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "La commande n'a pas pu être mise à jour.",
        );
      }
    });
  };

  const handleConfirmCancel = () => {
    if (!pendingStatus) return;
    startTransition(async () => {
      try {
        await updateCommandeStatus(commandeId, pendingStatus);
        toast.success("Commande annulée.");
        setPendingStatus(null);
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "La commande n'a pas pu être annulée.",
        );
      }
    });
  };

  return (
    <>
      <div className="flex w-full items-center gap-2 sm:w-auto">
        {primaryStatus && (
          <Button
            size="lg"
            className="flex-1 sm:flex-none"
            disabled={isPending}
            onClick={() => handleSelect(primaryStatus)}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {primaryLabel[primaryStatus] ?? STATUT_LABELS[primaryStatus]}
          </Button>
        )}
        {nextOptions.length > 1 && (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="lg"
            disabled={isPending}
          >
            Plus d&apos;actions
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {nextOptions
            .filter((option) => option !== primaryStatus)
            .map((option) => (
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
        )}
      </div>

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
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmer l&apos;annulation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
