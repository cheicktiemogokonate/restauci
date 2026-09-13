import type { Metadata } from "next";
import { IdentityVerificationForm } from "@/components/identity/identity-verification-form";
import { requirePartnerAccount } from "@/modules/partners/server";
import {
  getPartnerIdentityVerification,
  isPrivateIdentityStorageConfigured,
} from "@/modules/identity/server";
import {
  getPartnerPayoutDestination,
  listPaystackPayoutInstitutions,
} from "@/modules/transactions/server";
import { PayoutDestinationCard } from "@/modules/transactions/presentation/payout-destination-card";
import {
  configurePayoutDestinationAction,
  refreshPayoutDestinationAction,
} from "./actions";

export const metadata: Metadata = {
  title: "Vérification d’identité | Toutci",
};

export const dynamic = "force-dynamic";

export default async function PartnerIdentityVerificationPage() {
  const partnerAccount = await requirePartnerAccount();
  const [verification, payoutDestination] = await Promise.all([
    getPartnerIdentityVerification(partnerAccount.id),
    getPartnerPayoutDestination(partnerAccount.id),
  ]);
  let institutions: Awaited<ReturnType<typeof listPaystackPayoutInstitutions>> = [];
  let institutionsError: string | null = null;
  if (
    verification?.status === "verified" &&
    (!payoutDestination || payoutDestination.status === "disabled")
  ) {
    try {
      institutions = await listPaystackPayoutInstitutions();
      if (institutions.length === 0) {
        institutionsError =
          "Aucun établissement de versement XOF n’est disponible actuellement.";
      }
    } catch (error) {
      console.error("[payout] catalogue Paystack indisponible", error);
      institutionsError =
        "La liste des établissements est momentanément indisponible.";
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:px-6 sm:py-12">
      <IdentityVerificationForm
        initialVerification={verification}
        storageConfigured={isPrivateIdentityStorageConfigured()}
      />
      <PayoutDestinationCard
        identityVerified={verification?.status === "verified"}
        initialDestination={payoutDestination}
        institutions={institutions}
        institutionsError={institutionsError}
        actions={{
          configure: configurePayoutDestinationAction,
          refresh: refreshPayoutDestinationAction,
        }}
      />
    </main>
  );
}
