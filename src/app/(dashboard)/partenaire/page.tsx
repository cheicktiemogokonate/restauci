import { redirect } from "next/navigation";
import { requirePartnerAccount } from "@/lib/auth/partner-account";
import { listPartnerResidences } from "@/modules/residences/server";

export const dynamic = "force-dynamic";

export default async function PartnerHomePage() {
  const partnerAccount = await requirePartnerAccount();
  if (partnerAccount.activityType === "restaurant") redirect("/restaurateur");
  const residences = await listPartnerResidences(partnerAccount.id);
  redirect(
    residences.length > 0
      ? "/partenaire/residences"
      : "/partenaire/onboarding",
  );
}
