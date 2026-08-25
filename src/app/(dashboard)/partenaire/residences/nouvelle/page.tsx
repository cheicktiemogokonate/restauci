import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ResidenceForm } from "@/components/residences/residence-form";
import { Button } from "@/components/ui/button";
import { requirePartnerActivity } from "@/lib/auth/partner-account";

export const metadata = { title: "Nouvelle résidence | Toutci" };
export const dynamic = "force-dynamic";

export default async function NewResidencePage() {
  await requirePartnerActivity("residence");
  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6">
      <div><Button asChild variant="ghost" size="sm" className="-ml-3 mb-3"><Link href="/partenaire/residences"><ArrowLeft />Retour aux résidences</Link></Button><h1 className="text-3xl font-semibold tracking-tight text-slate-950">Nouvelle résidence</h1><p className="mt-2 text-sm leading-6 text-slate-600">Ajoutez un autre logement à votre compte partenaire.</p></div>
      <ResidenceForm />
    </main>
  );
}
