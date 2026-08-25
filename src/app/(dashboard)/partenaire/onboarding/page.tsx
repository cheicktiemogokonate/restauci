import { redirect } from "next/navigation";
import { ResidenceOnboardingWizard } from "@/components/residences/residence-onboarding-wizard";
import { requirePartnerActivity } from "@/lib/auth/partner-account";
import { listPartnerResidences } from "@/modules/residences/server";

export const metadata = { title: "Créer ma première résidence | Toutci" };
export const dynamic = "force-dynamic";

export default async function ResidenceOnboardingPage() {
  const partnerAccount = await requirePartnerActivity("residence");
  const residences = await listPartnerResidences(partnerAccount.id);
  if (residences.length > 0) redirect("/partenaire/residences");

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6 lg:py-8">
      <div>
        <p className="text-sm font-semibold text-emerald-700">Première résidence</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
          Configurez votre logement en quelques étapes
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Renseignez uniquement l’essentiel. Votre progression reste enregistrée sur cet appareil jusqu’à la création du logement.
        </p>
      </div>
      <ResidenceOnboardingWizard partnerAccountId={partnerAccount.id} />
    </main>
  );
}
