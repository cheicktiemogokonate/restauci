"use client";

import { Button } from "@/components/ui/button";
import { StatefulButton } from "@/components/motion/stateful-button";
import { Input } from "@/components/motion/input";
import { Textarea } from "@/components/ui/textarea";
import {
  CenterMorphModal,
  CenterMorphModalContent,
  CenterMorphModalTrigger,
} from "@/components/motion/center-morph-modal";
import { marquerCommissionsRestaurantPayeesAction } from "@/lib/actions/admin-commissions";
import { CheckCircle2 } from "lucide-react";
import { type MouseEvent, useState, useTransition } from "react";
import { toast } from "sonner";

export function CommissionPaymentButton({
  restaurantId,
  restaurantNom,
  montantFormate,
}: {
  restaurantId: string;
  restaurantNom: string;
  montantFormate: string;
}) {
  const [open, setOpen] = useState(false);
  const [referenceReglement, setReferenceReglement] = useState("");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  const confirmerPaiement = () => {
    if (referenceReglement.trim().length < 3) {
      toast.error("Saisissez une référence de règlement valide");
      return;
    }
    startTransition(async () => {
      try {
        const result = await marquerCommissionsRestaurantPayeesAction(
          restaurantId,
          referenceReglement.trim(),
          notes.trim() || undefined,
        );
        toast.success(`${montantFormate} encaissés pour ${restaurantNom}.`, {
          description: `${result.nombre} commission${result.nombre > 1 ? "s" : ""} marquée${result.nombre > 1 ? "s" : ""} comme payée${result.nombre > 1 ? "s" : ""}.`,
        });
        setOpen(false);
        setReferenceReglement("");
        setNotes("");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Le paiement n'a pas pu être enregistré.",
        );
      }
    });
  };

  return (
    <CenterMorphModal open={open} onOpenChange={setOpen}>
      <CenterMorphModalTrigger>
        <Button size="sm">
          <CheckCircle2 /> Marquer encaissé
        </Button>
      </CenterMorphModalTrigger>
      <CenterMorphModalContent
        ariaLabel="Confirmer l’encaissement"
        ariaDescribedBy={`commission-payment-${restaurantId}`}
        className="max-w-md rounded-2xl"
      >
        <div className="space-y-5 p-6">
          <div className="space-y-2 pr-8">
            <h2 className="text-lg font-semibold">Confirmer l’encaissement</h2>
            <p
              id={`commission-payment-${restaurantId}`}
              className="text-sm text-muted-foreground"
            >
              Confirmez que {montantFormate} ont été réglés par {restaurantNom}.
              Toutes ses commissions en attente seront marquées comme payées.
            </p>
          </div>
          <div className="space-y-2">
            <label
              htmlFor={`reference-${restaurantId}`}
              className="text-sm font-medium text-gray-700"
            >
              Référence de règlement{" "}
            </label>
            <Input
              id={`reference-${restaurantId}`}
              value={referenceReglement}
              onChange={setReferenceReglement}
              placeholder="Ex. TRX-2026-001"
              maxLength={255}
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor={`notes-${restaurantId}`}
              className="text-sm font-medium text-gray-700"
            >
              Notes <span className="text-gray-400">(facultatives)</span>
            </label>
            <Textarea
              id={`notes-${restaurantId}`}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Informations utiles pour le rapprochement…"
              maxLength={1000}
              disabled={isPending}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => setOpen(false)}
            >
              Annuler
            </Button>
            <StatefulButton
              state={isPending ? "loading" : "idle"}
              loadingText="Enregistrement…"
              successText="Encaissé"
              icon={<CheckCircle2 />}
              disabled={referenceReglement.trim().length < 3}
              onClick={(event: MouseEvent<HTMLButtonElement>) => {
                event.preventDefault();
                confirmerPaiement();
              }}
            >
              Confirmer l’encaissement
            </StatefulButton>
          </div>
        </div>
      </CenterMorphModalContent>
    </CenterMorphModal>
  );
}
