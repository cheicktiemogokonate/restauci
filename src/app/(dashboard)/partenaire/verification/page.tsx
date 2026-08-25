import type { Metadata } from "next";
import { IdentityVerificationForm } from "@/components/identity/identity-verification-form";
import { requirePartnerAccount } from "@/lib/auth/partner-account";
import {
  getPartnerIdentityVerification,
  isPrivateIdentityStorageConfigured,
} from "@/modules/identity/server";

export const metadata: Metadata = {
  title: "Vérification d’identité | Toutci",
};

export const dynamic = "force-dynamic";

export default async function PartnerIdentityVerificationPage() {
  const partnerAccount = await requirePartnerAccount();
  const verification = await getPartnerIdentityVerification(partnerAccount.id);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <IdentityVerificationForm
        initialVerification={verification}
        storageConfigured={isPrivateIdentityStorageConfigured()}
      />
    </main>
  );
}
