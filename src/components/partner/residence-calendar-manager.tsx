"use client";

import { useState, useTransition } from "react";
import { CalendarOff, Trash2 } from "lucide-react";
import { StatefulButton, type ButtonState } from "@/components/motion/stateful-button";
import { ResidenceDateRangePicker } from "@/components/residences/residence-date-range-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  ResidenceAvailabilityDTO,
  ResidenceUnavailablePeriodDTO,
} from "@/modules/residences/contracts";
import {
  createResidenceUnavailablePeriodAction,
  deleteResidenceUnavailablePeriodAction,
} from "@/app/(dashboard)/partenaire/residences/actions";

export function ResidenceCalendarManager({
  residenceId,
  periods,
  unavailable,
}: {
  residenceId: string;
  periods: ResidenceUnavailablePeriodDTO[];
  unavailable: ResidenceAvailabilityDTO["unavailable"];
}) {
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [buttonState, setButtonState] = useState<ButtonState>("idle");
  const [pending, startTransition] = useTransition();
  const [minimumDate] = useState(() =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Abidjan",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()),
  );

  const add = () => startTransition(async () => {
    setMessage(null);
    setButtonState("loading");
    const result = await createResidenceUnavailablePeriodAction({
      residenceId,
      checkIn,
      checkOut,
      reason: reason.trim() || null,
    });
    setMessage(result.message);
    setButtonState(result.success ? "success" : "error");
    if (result.success) {
      setCheckIn("");
      setCheckOut("");
      setReason("");
    }
  });

  const remove = (periodId: string) => startTransition(async () => {
    const result = await deleteResidenceUnavailablePeriodAction(residenceId, periodId);
    setMessage(result.message);
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 rounded-xl bg-slate-50 p-4">
        <ResidenceDateRangePicker
          checkIn={checkIn}
          checkOut={checkOut}
          minimumDate={minimumDate}
          unavailable={unavailable}
          onChange={(range) => {
            setCheckIn(range.checkIn);
            setCheckOut(range.checkOut);
            setButtonState("idle");
            setMessage(null);
          }}
        />
        <div className="space-y-2"><Label htmlFor={`block-reason-${residenceId}`}>Motif interne (facultatif)</Label><Input id={`block-reason-${residenceId}`} value={reason} maxLength={255} placeholder="Travaux, usage personnel…" onChange={(event) => setReason(event.target.value)} /></div>
        <StatefulButton
          type="button"
          state={pending ? "loading" : buttonState}
          loadingText="Blocage de la période…"
          successText="Période bloquée"
          errorText="Réessayer"
          icon={<CalendarOff />}
          disabled={pending || !checkIn || !checkOut}
          onClick={add}
        >
          Bloquer cette période
        </StatefulButton>
      </div>
      {message ? <p className="text-sm text-slate-600" role="status">{message}</p> : null}
      <div className="divide-y rounded-xl border">
        {periods.map((period) => <div key={period.id} className="flex items-center justify-between gap-3 p-3"><div><p className="text-sm font-semibold">{period.checkIn} → {period.checkOut}</p><p className="mt-0.5 text-xs text-slate-500">{period.reason ?? "Indisponibilité propriétaire"}</p></div><Button type="button" variant="ghost" size="icon" disabled={pending} aria-label="Supprimer cette indisponibilité" onClick={() => remove(period.id)}><Trash2 className="size-4 text-red-600" /></Button></div>)}
        {periods.length === 0 ? <p className="p-4 text-sm text-slate-500">Aucune période bloquée manuellement.</p> : null}
      </div>
    </div>
  );
}
