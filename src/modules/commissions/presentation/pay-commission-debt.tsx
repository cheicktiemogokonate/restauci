"use client";

// Paiement partenaire du domaine Commissions.

import { useState, useTransition } from "react";
import { WalletCards } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/motion/input";
import { formatPrix } from "@/shared/format";

export function PayCommissionDebt({
  availableDebtFcfa,
  onPay,
}: {
  availableDebtFcfa: number;
  onPay: (amount: number) => Promise<{ authorizationUrl: string }>;
}) {
  const [amount, setAmount] = useState(String(availableDebtFcfa));
  const [pending, startTransition] = useTransition();
  if (availableDebtFcfa <= 0) return null;
  return (
    <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
      <div>
        <p className="font-semibold">Payer mes commissions</p>
        <p className="text-sm text-muted-foreground">Disponible au règlement : {formatPrix(availableDebtFcfa)}</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Input
            id="commission-payment-amount"
            label="Montant FCFA"
            inputMode="numeric"
            value={amount}
            onChange={(value) => setAmount(value.replace(/\D/g, ""))}
          />
        </div>
        <Button disabled={pending || !amount} onClick={() => startTransition(async () => {
          try {
            const result = await onPay(Number(amount));
            window.location.assign(result.authorizationUrl);
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Paiement impossible");
          }
        })}>
          <WalletCards className="size-4" />{pending ? "Initialisation…" : "Payer avec Paystack"}
        </Button>
      </div>
    </div>
  );
}
