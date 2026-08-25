import type { ReactNode } from "react";
import { PartnerNavigation } from "@/components/partner/partner-navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPartnerAccountByUserId } from "@/modules/partners/server";
import { redirect } from "next/navigation";

export default async function PartnerLayout({ children }: { children: ReactNode }) {
  const session = await getCurrentUser();
  if (!session) redirect("/login");
  if (session.role !== "partner") redirect("/admin");
  const partnerAccount = await getPartnerAccountByUserId(session.userId);
  if (!partnerAccount) redirect("/onboarding");

  return (
    <div className="min-h-dvh bg-slate-50 lg:pl-72">
      <PartnerNavigation
        email={session.email}
        activityType={partnerAccount.activityType}
      />
      <div className="min-h-dvh">{children}</div>
    </div>
  );
}
