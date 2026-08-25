"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, FileCheck2, Loader2, LockKeyhole, Upload } from "lucide-react";
import { saveIdentityDraftAction, submitIdentityVerificationAction } from "@/app/(dashboard)/partenaire/verification/actions";
import { IdentityStatusBadge } from "@/modules/identity/presentation/identity-status-badge";
import type { IdentityDraftInput, PartnerIdentityVerificationDTO } from "@/modules/identity/contracts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  initialVerification: PartnerIdentityVerificationDTO | null;
  storageConfigured: boolean;
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Une erreur inattendue est survenue.";
}

export function IdentityVerificationForm({ initialVerification, storageConfigured }: Props) {
  const router = useRouter();
  const [verification, setVerification] = useState(initialVerification);
  const [legalName, setLegalName] = useState(initialVerification?.legalName ?? "");
  const [documentType, setDocumentType] = useState<"national_id" | "passport">(
    initialVerification?.documentType ?? "national_id",
  );
  const [documentCountryCode, setDocumentCountryCode] = useState(
    initialVerification?.documentCountryCode ?? "CI",
  );
  const [documentExpiresOn, setDocumentExpiresOn] = useState(
    initialVerification?.documentExpiresOn ?? "",
  );
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [uploadingSide, setUploadingSide] = useState<"front" | "back" | null>(null);
  const [isPending, startTransition] = useTransition();
  const editable = !verification || verification.status === "not_submitted" || verification.status === "rejected";
  const uploadedSides = useMemo(() => new Set(verification?.documents.map((item) => item.side) ?? []), [verification]);

  const draft = (): IdentityDraftInput => ({
    legalName,
    documentType,
    documentCountryCode,
    documentExpiresOn,
  });

  function runAction(kind: "save" | "submit") {
    setMessage(null);
    startTransition(async () => {
      try {
        const result = kind === "save"
          ? await saveIdentityDraftAction(draft())
          : await submitIdentityVerificationAction(draft());
        setMessage({ kind: "success", text: result.message });
        router.refresh();
      } catch (error) {
        setMessage({ kind: "error", text: errorMessage(error) });
      }
    });
  }

  async function upload(side: "front" | "back", file: File | undefined) {
    if (!file) return;
    setMessage(null);
    setUploadingSide(side);
    try {
      const data = new FormData();
      data.set("side", side);
      data.set("file", file);
      const response = await fetch("/api/partner/identity/documents", { method: "POST", body: data });
      const payload = await response.json() as { verification?: PartnerIdentityVerificationDTO; error?: string };
      if (!response.ok || !payload.verification) throw new Error(payload.error ?? "Envoi impossible.");
      setVerification(payload.verification);
      setMessage({ kind: "success", text: "Justificatif enregistré dans l’espace privé." });
      router.refresh();
    } catch (error) {
      setMessage({ kind: "error", text: errorMessage(error) });
    } finally {
      setUploadingSide(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="mb-2 text-sm font-semibold text-emerald-700">Sécurité du compte</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Vérification d’identité</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Nous vérifions l’identité du propriétaire du compte partenaire avant la publication d’une activité.
          </p>
        </div>
        <IdentityStatusBadge status={verification?.status ?? "not_submitted"} />
      </div>

      {!storageConfigured && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Stockage privé à configurer</AlertTitle>
          <AlertDescription>L’envoi de pièces est désactivé tant que le bucket KYC privé n’est pas configuré. Le brouillon peut être enregistré.</AlertDescription>
        </Alert>
      )}
      {verification?.status === "pending" && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-950">
          <LockKeyhole />
          <AlertTitle>Dossier en cours de vérification</AlertTitle>
          <AlertDescription>Les informations sont verrouillées jusqu’à la décision d’un administrateur.</AlertDescription>
        </Alert>
      )}
      {verification?.status === "verified" && (
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-950">
          <CheckCircle2 />
          <AlertTitle>Votre identité est vérifiée</AlertTitle>
          <AlertDescription>Ce prérequis est satisfait pour vos activités présentes et futures sur ce compte partenaire.</AlertDescription>
        </Alert>
      )}
      {verification?.status === "rejected" && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Une correction est nécessaire</AlertTitle>
          <AlertDescription>{verification.rejectionReason}</AlertDescription>
        </Alert>
      )}
      {message && (
        <Alert variant={message.kind === "error" ? "destructive" : "default"}>
          {message.kind === "error" ? <AlertCircle /> : <CheckCircle2 />}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Informations du propriétaire</CardTitle>
          <CardDescription>Recopiez les informations exactement comme elles apparaissent sur la pièce.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="legalName">Nom complet légal</Label>
            <Input id="legalName" value={legalName} onChange={(event) => setLegalName(event.target.value)} disabled={!editable} maxLength={255} autoComplete="name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="documentType">Type de pièce</Label>
            <select id="documentType" value={documentType} onChange={(event) => setDocumentType(event.target.value as "national_id" | "passport")} disabled={!editable} className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm disabled:opacity-50">
              <option value="national_id">Carte nationale d’identité</option>
              <option value="passport">Passeport</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="countryCode">Pays d’émission</Label>
            <Input id="countryCode" value={documentCountryCode} onChange={(event) => setDocumentCountryCode(event.target.value.toUpperCase().slice(0, 2))} disabled={!editable} maxLength={2} aria-describedby="country-help" />
            <p id="country-help" className="text-xs text-muted-foreground">Code pays à 2 lettres, par exemple CI.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="expiresOn">Date d’expiration</Label>
            <Input id="expiresOn" type="date" value={documentExpiresOn} onChange={(event) => setDocumentExpiresOn(event.target.value)} disabled={!editable} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Justificatifs</CardTitle>
          <CardDescription>PDF, JPEG ou PNG, 8 Mo maximum par fichier. Les documents ne sont jamais publics.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {(["front", ...(documentType === "national_id" ? ["back"] : [])] as ("front" | "back")[]).map((side) => {
            const existing = verification?.documents.find((item) => item.side === side);
            return (
              <div key={side} className="rounded-xl border border-dashed p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{documentType === "passport" ? "Page d’identité" : side === "front" ? "Recto" : "Verso"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{existing ? `${Math.ceil(existing.sizeBytes / 1024)} Ko enregistrés` : "Aucun fichier envoyé"}</p>
                  </div>
                  {uploadedSides.has(side) && <FileCheck2 className="size-5 text-emerald-600" />}
                </div>
                {existing && <a className="mt-3 inline-block text-sm font-medium text-emerald-700 underline" href={`/api/partner/identity/documents/${existing.id}`} target="_blank" rel="noreferrer">Voir le document</a>}
                {editable && (
                  <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
                    {uploadingSide === side ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                    {existing ? "Remplacer" : "Choisir un fichier"}
                    <input type="file" accept="image/jpeg,image/png,application/pdf" className="sr-only" disabled={!storageConfigured || uploadingSide !== null} onChange={(event) => void upload(side, event.target.files?.[0])} />
                  </label>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {editable && (
        <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
          <Button variant="outline" onClick={() => runAction("save")} disabled={isPending}>Enregistrer le brouillon</Button>
          <Button onClick={() => runAction("submit")} disabled={isPending || !storageConfigured}>
            {isPending && <Loader2 className="animate-spin" />}
            Soumettre pour vérification
          </Button>
        </div>
      )}
    </div>
  );
}
