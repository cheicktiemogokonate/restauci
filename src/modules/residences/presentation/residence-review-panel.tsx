"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ResidenceModerationStatus } from "@/modules/residences/model";
import type { ResidenceReviewActions } from "./action-types";

export function ResidenceReviewPanel({ residenceId, status, actions }: { residenceId: string; status: ResidenceModerationStatus; actions: ResidenceReviewActions }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function decide(kind: "approve" | "reject" | "suspend" | "reactivate") {
    setMessage(null);
    startTransition(async () => {
      try {
        const result = kind === "approve"
          ? await actions.approve(residenceId)
          : kind === "reject"
            ? await actions.reject({ residenceId, reason })
            : kind === "suspend"
              ? await actions.suspend({ residenceId, reason })
              : await actions.reactivate(residenceId);
        setMessage({ error: !result.success, text: result.message });
        if (!result.success) return;
        router.refresh();
      } catch (error) {
        setMessage({ error: true, text: error instanceof Error ? error.message : "Décision impossible." });
      }
    });
  }

  return (
    <Card>
      <CardHeader><CardTitle>Décision</CardTitle><CardDescription>La décision est auditée et notifiée au partenaire.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        {message ? <Alert variant={message.error ? "destructive" : "default"}>{message.error ? <AlertCircle /> : <CheckCircle2 />}<AlertDescription>{message.text}</AlertDescription></Alert> : null}
        {status === "pending" || status === "approved" ? <div className="space-y-2"><Label htmlFor="residence-review-reason">{status === "pending" ? "Motif si correction demandée" : "Motif de suspension"}</Label><Textarea id="residence-review-reason" value={reason} onChange={(event) => setReason(event.target.value)} minLength={10} maxLength={1000} rows={5} placeholder="Expliquez précisément la décision…" /></div> : null}
        {status === "pending" ? <div className="grid gap-2"><Button onClick={() => decide("approve")} disabled={isPending}>{isPending ? <Loader2 className="animate-spin" /> : null}Valider la résidence</Button><Button variant="destructive" onClick={() => decide("reject")} disabled={isPending || reason.trim().length < 10}>Demander une correction</Button></div> : null}
        {status === "approved" ? <Button variant="destructive" className="w-full" onClick={() => decide("suspend")} disabled={isPending || reason.trim().length < 10}>{isPending ? <Loader2 className="animate-spin" /> : null}Suspendre la résidence</Button> : null}
        {status === "suspended" ? <Button className="w-full" onClick={() => decide("reactivate")} disabled={isPending}>{isPending ? <Loader2 className="animate-spin" /> : null}Réactiver la résidence</Button> : null}
        {status === "draft" ? <p className="text-sm leading-6 text-slate-600">Le partenaire n’a pas encore demandé la publication.</p> : null}
        {status === "rejected" ? <p className="text-sm leading-6 text-slate-600">En attente des corrections du partenaire.</p> : null}
      </CardContent>
    </Card>
  );
}
