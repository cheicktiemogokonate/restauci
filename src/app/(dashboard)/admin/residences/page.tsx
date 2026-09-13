import { Building2 } from "lucide-react";
import { AdminPage } from "@/components/admin/ui/admin-page";
import { PageHeader } from "@/components/admin/ui/page-header";
import { getAdminSession } from "@/modules/auth/server";
import type { ResidenceModerationStatus } from "@/modules/residences/model";
import { AdminResidencesTable } from "@/modules/residences/presentation/admin-residences-table";
import { listAdminResidencesWithPublication } from "@/modules/residences/server";

const validStatuses = new Set<ResidenceModerationStatus>(["draft", "pending", "approved", "rejected", "suspended"]);

export default async function AdminResidencesPage({ searchParams }: { searchParams: Promise<{ status?: string; search?: string; page?: string }> }) {
  await getAdminSession();
  const params = await searchParams;
  const status = validStatuses.has(params.status as ResidenceModerationStatus) ? params.status as ResidenceModerationStatus : undefined;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const result = await listAdminResidencesWithPublication({ status, search: params.search, page, limit: 20 });
  return (
    <AdminPage>
      <PageHeader title="Résidences" description="Vérifiez les logements proposés par les partenaires Résidence." action={<div className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2"><Building2 className="size-4 text-emerald-600" /><span className="text-sm font-semibold">{result.total} logements</span></div>} />
      <AdminResidencesTable
        items={result.items}
        page={result.page}
        totalPages={result.totalPages}
        search={params.search}
        status={status}
      />
    </AdminPage>
  );
}
