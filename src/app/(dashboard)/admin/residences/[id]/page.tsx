import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Building2, CircleCheck, CircleX, MapPin, Users } from "lucide-react";
import { notFound } from "next/navigation";
import { ResidenceReviewPanel } from "@/modules/residences/presentation/residence-review-panel";
import { PaystackProviderAccountCard } from "@/components/admin/paystack-provider-account-card";
import { AdminPage } from "@/components/admin/ui/admin-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminSession } from "@/modules/auth/server";
import { formatPrix } from "@/shared/format";
import {
  getResidenceVisibilityBlockerMessage,
  ResidencePublicationStatusBadge,
} from "@/modules/residences/presentation/residence-publication-status";
import { ResidenceStatusBadge } from "@/modules/residences/presentation/residence-status-badge";
import {
  getAdminResidenceAccountSummary,
  getAdminResidenceWithPublication,
} from "@/modules/residences/server";
import { getPaystackProviderAccount } from "@/modules/transactions/server";
import {
  approveResidenceAction,
  reactivateResidenceAction,
  rejectResidenceAction,
  suspendResidenceAction,
} from "../actions";

export default async function AdminResidenceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await getAdminSession();
  const { id } = await params;
  const residence = await getAdminResidenceWithPublication(id);
  if (!residence) notFound();
  const [providerAccount, accountSummary] = await Promise.all([
    getPaystackProviderAccount(residence.partnerAccountId),
    getAdminResidenceAccountSummary(residence.partnerAccountId),
  ]);
  return (
    <AdminPage className="max-w-6xl">
      <div><Button asChild variant="ghost" size="sm" className="-ml-3 mb-3"><Link href="/admin/residences"><ArrowLeft />Retour aux résidences</Link></Button><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><p className="text-sm font-semibold text-emerald-700">Logement partenaire</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">{residence.title}</h1><p className="mt-1 text-sm text-slate-500">{residence.accountName} · {residence.accountEmail}</p></div><ResidenceStatusBadge status={residence.moderationStatus} /></div></div>
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card><CardHeader><CardTitle>Présentation</CardTitle></CardHeader><CardContent className="space-y-5"><p className="max-w-3xl whitespace-pre-line text-sm leading-6 text-slate-700">{residence.description}</p><div className="flex flex-wrap gap-x-6 gap-y-2 text-sm"><span className="flex items-center gap-2 font-semibold text-emerald-800"><Building2 className="size-4" />{formatPrix(residence.pricePerNightFcfa)} / nuit</span><span className="flex items-center gap-2"><Users className="size-4 text-slate-400" />{residence.maxGuests} voyageurs</span><span className="flex items-center gap-2"><MapPin className="size-4 text-slate-400" />{residence.address}, {residence.city}, {residence.country}</span></div></CardContent></Card>
          <Card><CardHeader><CardTitle>Photos publiques</CardTitle></CardHeader><CardContent>{residence.photos.length > 0 ? <div className="grid gap-3 sm:grid-cols-2">{residence.photos.map((photo) => <div key={photo.id} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-100"><Image src={photo.url} alt={photo.altText ?? residence.title} fill sizes="(max-width: 640px) 100vw, 50vw" className="object-cover" unoptimized /></div>)}</div> : <p className="text-sm text-slate-500">Aucune photo enregistrée.</p>}</CardContent></Card>
        </div>
        <div className="space-y-6">
          <ResidenceReviewPanel
            residenceId={residence.id}
            status={residence.moderationStatus}
            actions={{
              approve: approveResidenceAction,
              reject: rejectResidenceAction,
              suspend: suspendResidenceAction,
              reactivate: reactivateResidenceAction,
            }}
          />
          <PaystackProviderAccountCard
            resourceType="residence"
            resourceId={residence.id}
            partnerAccountId={residence.partnerAccountId}
            account={providerAccount ? {
              providerAccountReference: providerAccount.providerAccountReference,
              status: providerAccount.status,
              verifiedAt: providerAccount.verifiedAt,
            } : null}
          />
          <Card>
            <CardHeader><div className="flex flex-wrap items-center justify-between gap-2"><CardTitle>Publication publique</CardTitle><ResidencePublicationStatusBadge publication={residence.publication} /></div></CardHeader>
            <CardContent className="space-y-4 text-sm">
              {residence.publication.isPubliclyVisible ? (
                <p className="flex items-start gap-2 leading-6 text-emerald-800"><CircleCheck className="mt-1 size-4 shrink-0" />Tous les critères de publication sont satisfaits.</p>
              ) : (
                <ul className="space-y-3">
                  {residence.publication.blockers.map((blocker) => {
                    const message = getResidenceVisibilityBlockerMessage(blocker);
                    return <li key={blocker} className="flex items-start gap-2"><CircleX className="mt-1 size-4 shrink-0 text-amber-600" /><span><span className="block font-medium text-slate-900">{message.title}</span><span className="mt-0.5 block leading-5 text-slate-600">{message.description}</span></span></li>;
                  })}
                </ul>
              )}
              <dl className="space-y-2 border-t pt-3 text-xs text-slate-600">
                <div className="flex justify-between gap-3"><dt>Destination</dt><dd className="text-right font-medium text-slate-800">{residence.publication.serviceMarketName ?? "Non résolue"}</dd></div>
                <div className="flex justify-between gap-3"><dt>Offre</dt><dd className="text-right font-medium text-slate-800">{residence.publication.quota.planCode}</dd></div>
                <div className="flex justify-between gap-3"><dt>Résidences publiques du compte</dt><dd className="text-right font-medium text-slate-800">{accountSummary.visibleCount} / {accountSummary.quota.maxPublicResidences ?? "illimité"}</dd></div>
              </dl>
            </CardContent>
          </Card>
          <Card><CardHeader><CardTitle>Compte partenaire</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p className="font-medium">{residence.accountName}</p><p className="text-slate-600">{residence.accountEmail}</p><p className="text-slate-600">{residence.accountPhone}</p><Button asChild variant="outline" size="sm" className="mt-2"><Link href="/admin/verifications">Voir la vérification d’identité</Link></Button></CardContent></Card>
        </div>
      </div>
    </AdminPage>
  );
}
