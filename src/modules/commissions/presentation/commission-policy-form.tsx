"use client";

// Politique du domaine Commissions.

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { Input } from "@/components/motion/input";
import { StatefulButton } from "@/components/motion/stateful-button";

export function CommissionPolicyForm({
  initial,
  onUpdate,
}: {
  initial: {
    cashDebtThresholdFcfa: number;
    cashGraceDays: number;
    cashDebtRecoveryMaxBps: number;
  };
  onUpdate: (input: {
    cashDebtThresholdFcfa: number;
    cashGraceDays: number;
    cashDebtRecoveryMaxBps: number;
  }) => Promise<unknown>;
}) {
  const [threshold, setThreshold] = useState(String(initial.cashDebtThresholdFcfa));
  const [graceDays, setGraceDays] = useState(String(initial.cashGraceDays));
  const [recoveryPercent, setRecoveryPercent] = useState(
    String(initial.cashDebtRecoveryMaxBps / 100),
  );
  const [isPending, startTransition] = useTransition();

  const save = () => {
    const payload = {
      cashDebtThresholdFcfa: Number(threshold),
      cashGraceDays: Number(graceDays),
      cashDebtRecoveryMaxBps: Number(recoveryPercent) * 100,
    };
    if (
      !Number.isSafeInteger(payload.cashDebtThresholdFcfa) ||
      payload.cashDebtThresholdFcfa < 0 ||
      !Number.isSafeInteger(payload.cashGraceDays) ||
      payload.cashGraceDays < 0 ||
      !Number.isInteger(payload.cashDebtRecoveryMaxBps) ||
      payload.cashDebtRecoveryMaxBps < 0 ||
      payload.cashDebtRecoveryMaxBps > 5_000
    ) {
      toast.error("Vérifiez le seuil, le délai et le plafond (maximum 50 %).");
      return;
    }
    startTransition(async () => {
      try {
        await onUpdate(payload);
        toast.success("Politique de commissions mise à jour et auditée.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Mise à jour impossible.");
      }
    });
  };

  return (
    <section className="rounded-xl border bg-white p-5">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
          <ShieldCheck className="size-5" />
        </div>
        <div>
          <h2 className="font-semibold">Dette de commissions cash</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ces règles s’appliquent aux nouveaux cycles. Un cycle ouvert conserve son seuil et son délai d’origine.
          </p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="space-y-2 text-sm font-medium">
          Seuil de déclenchement (FCFA)
          <Input value={threshold} onChange={setThreshold} inputMode="numeric" disabled={isPending} />
        </label>
        <label className="space-y-2 text-sm font-medium">
          Délai de grâce (jours)
          <Input value={graceDays} onChange={setGraceDays} inputMode="numeric" disabled={isPending} />
        </label>
        <label className="space-y-2 text-sm font-medium">
          Récupération maximale (%)
          <Input value={recoveryPercent} onChange={setRecoveryPercent} inputMode="decimal" disabled={isPending} />
        </label>
      </div>
      <div className="mt-5 flex justify-end">
        <StatefulButton state={isPending ? "loading" : "idle"} loadingText="Enregistrement…" successText="Enregistré" onClick={save}>
          Enregistrer la politique
        </StatefulButton>
      </div>
    </section>
  );
}
