"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { rejectPartnerIdentityAction, verifyPartnerIdentityAction } from "@/app/(dashboard)/admin/verifications/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { IdentityVerificationStatus } from "@/modules/identity/model";

export function IdentityReviewPanel({ verificationId, status, rejectionReason }: { verificationId: string; status: IdentityVerificationStatus; rejectionReason: string | null }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function decide(kind: "verify" | "reject") {
    setMessage(null);
    startTransition(async () => {
      try {
        const result = kind === "verify"
          ? await verifyPartnerIdentityAction(verificationId)
          : await rejectPartnerIdentityAction({ verificationId, reason });
        setMessage({ error: false, text: result.message });
        router.refresh();
      } catch (error) {
        setMessage({ error: true, text: error instanceof Error ? error.message : "Décision impossible." });
      }
    });
  }

  return (
    <Card>
      <CardHeader><CardTitle>Décision</CardTitle><CardDescription>Comparez les informations déclarées avec chaque justificatif.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        {message && <Alert variant={message.error ? "destructive" : "default"}>{message.error ? <AlertCircle /> : <CheckCircle2 />}<AlertDescription>{message.text}</AlertDescription></Alert>}
        {status === "pending" ? <>
          <div className="space-y-2"><Label htmlFor="rejectionReason">Motif si correction demandée</Label><Textarea id="rejectionReason" value={reason} onChange={(event) => setReason(event.target.value)} minLength={10} maxLength={1000} placeholder="Expliquez précisément ce que le partenaire doit corriger…" rows={5} /></div>
          <div className="grid gap-2"><Button onClick={() => decide("verify")} disabled={isPending}>{isPending && <Loader2 className="animate-spin" />}Valider l’identité</Button><Button variant="destructive" onClick={() => decide("reject")} disabled={isPending || reason.trim().length < 10}>Demander une correction</Button></div>
        </> : <p className="text-sm leading-6 text-slate-600">Ce dossier a déjà été traité.{status === "rejected" && rejectionReason ? ` Motif : ${rejectionReason}` : ""}</p>}
      </CardContent>
    </Card>
  );
}
