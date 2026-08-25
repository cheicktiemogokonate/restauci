import Link from "next/link";
import { ArrowLeft, ExternalLink, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { IdentityReviewPanel } from "@/components/admin/identity-review-panel";
import { AdminPage } from "@/components/admin/ui/admin-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminSession } from "@/lib/auth/get-admin-session";
import { IdentityStatusBadge } from "@/modules/identity/presentation/identity-status-badge";
import { getAdminIdentityVerification } from "@/modules/identity/server";

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: value.includes("T") ? "short" : undefined }).format(new Date(value)) : "—";
}

export default async function AdminIdentityVerificationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await getAdminSession();
  const { id } = await params;
  const verification = await getAdminIdentityVerification(id);
  if (!verification) notFound();

  return (
    <AdminPage className="max-w-6xl">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3 mb-3"><Link href="/admin/verifications"><ArrowLeft />Retour aux vérifications</Link></Button>
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div><p className="text-sm font-semibold text-emerald-700">Dossier partenaire</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">{verification.legalName ?? verification.accountName}</h1><p className="mt-1 text-sm text-slate-500">{verification.accountEmail} · {verification.activityType === "restaurant" ? "Restaurant" : "Résidence"}</p></div>
          <IdentityStatusBadge status={verification.status} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Informations déclarées</CardTitle></CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <div><p className="text-xs uppercase tracking-wide text-slate-500">Nom légal</p><p className="mt-1 font-medium">{verification.legalName ?? "—"}</p></div>
              <div><p className="text-xs uppercase tracking-wide text-slate-500">Type de pièce</p><p className="mt-1 font-medium">{verification.documentType === "national_id" ? "Carte nationale d’identité" : "Passeport"}</p></div>
              <div><p className="text-xs uppercase tracking-wide text-slate-500">Pays d’émission</p><p className="mt-1 font-medium">{verification.documentCountryCode ?? "—"}</p></div>
              <div><p className="text-xs uppercase tracking-wide text-slate-500">Expiration</p><p className="mt-1 font-medium">{formatDate(verification.documentExpiresOn)}</p></div>
              <div><p className="text-xs uppercase tracking-wide text-slate-500">Téléphone du compte</p><p className="mt-1 font-medium">{verification.accountPhone || "—"}</p></div>
              <div><p className="text-xs uppercase tracking-wide text-slate-500">Soumis le</p><p className="mt-1 font-medium">{formatDate(verification.submittedAt)}</p></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Justificatifs privés</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {verification.documents.map((document) => (
                <a key={document.id} href={`/api/admin/identity/documents/${document.id}`} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border p-4 transition-colors hover:border-emerald-300 hover:bg-emerald-50/40">
                  <div><p className="font-medium">{document.side === "front" ? (verification.documentType === "passport" ? "Page d’identité" : "Recto") : "Verso"}</p><p className="mt-1 text-xs text-slate-500">{document.contentType} · {Math.ceil(document.sizeBytes / 1024)} Ko</p></div><ExternalLink className="size-4 text-slate-400" />
                </a>
              ))}
              {verification.documents.length === 0 && <p className="text-sm text-slate-500">Aucun justificatif enregistré.</p>}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <IdentityReviewPanel verificationId={verification.id} status={verification.status} rejectionReason={verification.rejectionReason} />
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="size-4 text-emerald-600" />Traçabilité</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm"><p><span className="text-slate-500">Revu le :</span> {formatDate(verification.reviewedAt)}</p><p><span className="text-slate-500">Par :</span> {verification.reviewedByAdminName ?? "—"}</p><p className="text-xs leading-5 text-slate-500">La décision est enregistrée dans le journal d’audit.</p></CardContent>
          </Card>
        </div>
      </div>
    </AdminPage>
  );
}
