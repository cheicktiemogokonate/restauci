"use client";

// Encaissement administrateur du domaine Commissions.

import { Button } from "@/components/ui/button";
import { StatefulButton } from "@/components/motion/stateful-button";
import { Input } from "@/components/motion/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/motion/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CenterMorphModal,
  CenterMorphModalContent,
  CenterMorphModalTrigger,
} from "@/components/motion/center-morph-modal";
import { formatPrix } from "@/shared/format";
import { CheckCircle2 } from "lucide-react";
import { type MouseEvent, useState, useTransition } from "react";
import { toast } from "sonner";

export function CommissionPaymentButton({
  partnerAccountId,
  restaurantNom,
  montantDu,
  onCreateSettlement,
}: {
  partnerAccountId: string;
  restaurantNom: string;
  montantDu: number;
  onCreateSettlement: (input: {
    partnerAccountId: string;
    amountFcfa: number;
    method: "mobile_money" | "virement" | "especes" | "cheque";
    externalReference: string;
    justification: string;
    paidAt: string;
  }) => Promise<{ allocations: unknown[] }>;
}) {
  const [open, setOpen] = useState(false);
  const [referenceReglement, setReferenceReglement] = useState("");
  const [justification, setJustification] = useState("");
  const [amount, setAmount] = useState(String(montantDu));
  const [method, setMethod] = useState<"mobile_money" | "virement" | "especes" | "cheque">("mobile_money");
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [isPending, startTransition] = useTransition();

  const confirmerPaiement = () => {
    if (referenceReglement.trim().length < 3) {
      toast.error("Saisissez une référence de règlement valide");
      return;
    }
    startTransition(async () => {
      try {
        const result = await onCreateSettlement({
          partnerAccountId,
          amountFcfa: Number(amount),
          method,
          externalReference: referenceReglement.trim(),
          justification: justification.trim(),
          paidAt,
        });
        toast.success(`${formatPrix(Number(amount))} encaissés pour ${restaurantNom}.`, {
          description: `${result.allocations.length} ligne${result.allocations.length > 1 ? "s" : ""} de commission allouée${result.allocations.length > 1 ? "s" : ""} en FIFO.`,
        });
        setOpen(false);
        setReferenceReglement("");
        setJustification("");
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
        ariaDescribedBy={`commission-payment-${partnerAccountId}`}
        className="max-w-md rounded-2xl"
      >
        <div className="space-y-5 p-6">
          <div className="space-y-2 pr-8">
            <h2 className="text-lg font-semibold">Confirmer l’encaissement</h2>
            <p
              id={`commission-payment-${partnerAccountId}`}
              className="text-sm text-muted-foreground"
            >
              Enregistrez uniquement un règlement réellement reçu. Le montant
              sera alloué aux commissions cash les plus anciennes, avec prise
              en charge des paiements partiels.
            </p>
          </div>
          <div className="space-y-2">
            <label
              htmlFor={`amount-${partnerAccountId}`}
              className="text-sm font-medium text-gray-700"
            >
              Montant reçu (FCFA)
            </label>
            <Input
              id={`amount-${partnerAccountId}`}
              value={amount}
              onChange={setAmount}
              inputMode="numeric"
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">Dette actuelle : {formatPrix(montantDu)}</p>
          </div>
          <div className="space-y-2">
            <span className="text-sm font-medium text-gray-700">
              Moyen reçu
            </span>
            <Select
              value={method}
              onValueChange={(value) => setMethod(value as typeof method)}
              disabled={isPending}
            >
              <SelectTrigger ariaLabel="Moyen de règlement reçu">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mobile_money">Mobile Money</SelectItem>
                <SelectItem value="virement">Virement</SelectItem>
                <SelectItem value="especes">Espèces</SelectItem>
                <SelectItem value="cheque">Chèque</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label htmlFor={`paid-at-${partnerAccountId}`} className="text-sm font-medium text-gray-700">Date reçue</label>
            <Input id={`paid-at-${partnerAccountId}`} type="date" value={paidAt} onChange={setPaidAt} disabled={isPending} />
          </div>
          <div className="space-y-2">
            <label
              htmlFor={`reference-${partnerAccountId}`}
              className="text-sm font-medium text-gray-700"
            >
              Référence de règlement{" "}
            </label>
            <Input
              id={`reference-${partnerAccountId}`}
              value={referenceReglement}
              onChange={setReferenceReglement}
              placeholder="Ex. TRX-2026-001"
              maxLength={255}
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor={`notes-${partnerAccountId}`}
              className="text-sm font-medium text-gray-700"
            >
              Justification administrative
            </label>
            <Textarea
              id={`notes-${partnerAccountId}`}
              value={justification}
              onChange={(event) => setJustification(event.target.value)}
              placeholder="Motif et éléments vérifiés avant cet encaissement…"
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
              disabled={referenceReglement.trim().length < 3 || justification.trim().length < 10 || !Number.isSafeInteger(Number(amount)) || Number(amount) <= 0 || Number(amount) > montantDu}
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
