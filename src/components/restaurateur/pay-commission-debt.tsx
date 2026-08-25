"use client";

import { useState, useTransition } from "react";
import { WalletCards } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { payCommissionDebtAction } from "@/lib/actions/partner-payments";
import { formatPrix } from "@/lib/utils/format";

export function PayCommissionDebt({ availableDebtFcfa }: { availableDebtFcfa: number }) {
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
          <Label htmlFor="commission-payment-amount">Montant FCFA</Label>
          <Input id="commission-payment-amount" inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value.replace(/\D/g, ""))} className="mt-1" />
        </div>
        <Button disabled={pending || !amount} onClick={() => startTransition(async () => {
          try {
            const result = await payCommissionDebtAction(Number(amount));
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
