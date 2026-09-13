import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { ResidenceForm } from "@/modules/residences/presentation/residence-form";
import { Button } from "@/components/ui/button";
import { requirePartnerActivity } from "@/modules/partners/server";
import { ResidenceStatusBadge } from "@/modules/residences/presentation/residence-status-badge";
import { getPartnerResidence } from "@/modules/residences/server";
import {
  createResidenceAction,
  geocodeResidenceAddressAction,
  updateResidenceAction,
} from "../actions";

export const dynamic = "force-dynamic";

export default async function EditResidencePage({ params }: { params: Promise<{ id: string }> }) {
  const partnerAccount = await requirePartnerActivity("residence");
  const { id } = await params;
  const residence = await getPartnerResidence(partnerAccount.id, id);
  if (!residence) notFound();
  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6">
      <div><Button asChild variant="ghost" size="sm" className="-ml-3 mb-3"><Link href="/partenaire/residences"><ArrowLeft />Retour aux résidences</Link></Button><div className="flex flex-wrap items-center gap-3"><h1 className="text-3xl font-semibold tracking-tight text-slate-950">{residence.title}</h1><ResidenceStatusBadge status={residence.moderationStatus} /></div><p className="mt-2 text-sm leading-6 text-slate-600">Modifiez le contenu du logement ou suivez les corrections demandées.</p></div>
      <ResidenceForm
        residence={residence}
        actions={{
          create: createResidenceAction,
          update: updateResidenceAction,
          geocode: geocodeResidenceAddressAction,
        }}
      />
    </main>
  );
}
