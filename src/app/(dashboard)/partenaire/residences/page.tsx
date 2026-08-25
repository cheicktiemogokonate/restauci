import Image from "next/image";
import Link from "next/link";
import { Building2, CheckCircle2, Eye, Plus, ShieldCheck, WalletCards } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ResidencePublicationControls } from "@/components/residences/residence-publication-controls";
import { requirePartnerActivity } from "@/lib/auth/partner-account";
import { formatPrix } from "@/lib/utils/format";
import type { ResidenceModerationStatus } from "@/modules/residences/model";
import {
  getResidenceVisibilityMessage,
  ResidencePublicationStatusBadge,
} from "@/modules/residences/presentation/residence-publication-status";
import { ResidenceStatusBadge } from "@/modules/residences/presentation/residence-status-badge";
import { listPartnerResidencesWithPublication } from "@/modules/residences/server";

export const metadata = { title: "Mes résidences | Toutci" };
export const dynamic = "force-dynamic";

const outcomeMessages = {
  "review-requested": {
    title: "Votre résidence a été envoyée pour vérification",
    description:
      "L’équipe Toutci examine maintenant la fiche. Vous n’avez rien d’autre à faire pour le moment et vous retrouverez son statut ici.",
  },
  "draft-saved": {
    title: "Votre brouillon est enregistré",
    description:
      "Vous pouvez le compléter quand vous le souhaitez avant de l’envoyer pour vérification.",
  },
} as const;

const statusGuidance: Record<
  ResidenceModerationStatus,
  { action: string }
> = {
  draft: {
    action: "Continuer",
  },
  pending: {
    action: "Consulter",
  },
  approved: {
    action: "Gérer",
  },
  rejected: {
    action: "Corriger",
  },
  suspended: {
    action: "Consulter",
  },
};

export default async function PartnerResidencesPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string | string[] }>;
}) {
  const partnerAccount = await requirePartnerActivity("residence");
  const residences = await listPartnerResidencesWithPublication(partnerAccount.id);
  const requestedOutcome = (await searchParams).result;
  const outcome =
    typeof requestedOutcome === "string" && requestedOutcome in outcomeMessages
      ? outcomeMessages[requestedOutcome as keyof typeof outcomeMessages]
      : null;
  const visibleCount = residences.filter(
    (residence) => residence.publication.isPubliclyVisible,
  ).length;
  const quota = residences[0]?.publication.quota;

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Mes résidences</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Gérez vos logements et suivez leur vérification par l’équipe Toutci.
          </p>
        </div>
        <Button asChild><Link href="/partenaire/residences/nouvelle"><Plus />Ajouter une résidence</Link></Button>
      </div>

      {outcome ? (
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-950">
          <CheckCircle2 />
          <AlertTitle>{outcome.title}</AlertTitle>
          <AlertDescription className="text-emerald-900">
            {outcome.description}
          </AlertDescription>
        </Alert>
      ) : null}

      <nav aria-label="Raccourcis du compte" className="flex flex-wrap items-center gap-2 border-y py-4">
        <Button asChild variant="outline" size="sm"><Link href="/partenaire/verification"><ShieldCheck />Vérification d’identité</Link></Button>
        <Button asChild variant="outline" size="sm"><Link href="/partenaire/facturation"><WalletCards />Facturation</Link></Button>
        {quota ? (
          <span className="ml-auto text-sm font-medium text-slate-600">
            Logements publics : {visibleCount} / {quota.maxPublicResidences ?? "illimité"}
          </span>
        ) : null}
      </nav>

      {residences.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed bg-white p-8 text-center">
          <Building2 className="size-10 text-emerald-700" />
          <h2 className="mt-4 text-lg font-semibold">Ajoutez votre premier logement</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">Créez un brouillon, ajoutez vos photos puis demandez sa vérification lorsque la fiche est prête.</p>
          <Button asChild className="mt-5"><Link href="/partenaire/onboarding">Commencer</Link></Button>
        </div>
      ) : (
        <div className="space-y-3">
          {residences.map((residence) => {
            const publicationMessage = getResidenceVisibilityMessage(
              residence.publication,
            );
            return <Card key={residence.id}>
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-lg bg-slate-100 sm:w-36">
                  {residence.photos[0] ? <Image src={residence.photos[0].url} alt={residence.photos[0].altText ?? residence.title} fill sizes="144px" className="object-cover" unoptimized /> : <Building2 className="absolute inset-0 m-auto size-8 text-slate-400" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-slate-950">{residence.title}</h2><ResidenceStatusBadge status={residence.moderationStatus} /><ResidencePublicationStatusBadge publication={residence.publication} /></div>
                  <p className="mt-1 text-sm text-slate-600">{residence.city} · Jusqu’à {residence.maxGuests} voyageurs</p>
                  <p className="mt-2 font-semibold text-emerald-800">{formatPrix(residence.pricePerNightFcfa)} / nuit</p>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                    <span className="font-medium text-slate-800">{publicationMessage.title}.</span>{" "}
                    {residence.motifRejet ?? publicationMessage.description}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col">
                  <ResidencePublicationControls
                    residenceId={residence.id}
                    publicationEnabled={residence.publication.publicationEnabled}
                    canPublish={residence.publication.canPublish}
                  />
                  {residence.publication.isPubliclyVisible ? (
                    <Button asChild size="sm">
                      <Link href={`/residences/${residence.slug}`}><Eye />Voir en public</Link>
                    </Button>
                  ) : null}
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/partenaire/residences/${residence.id}`}>
                      {statusGuidance[residence.moderationStatus].action}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          })}
        </div>
      )}
    </main>
  );
}
