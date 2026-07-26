import { AuditAdminFilters } from "@/components/admin/audit-admin-filters";
import { AuditAdminTable } from "@/components/admin/audit-admin-table";
import { AdminPage } from "@/components/admin/ui/admin-page";
import { PageHeader } from "@/components/admin/ui/page-header";
import { Button } from "@/components/ui/button";
import { getAdminSession } from "@/lib/auth/get-admin-session";
import { parsePage } from "@/lib/config/pagination";
import { getAuditLogAdmin } from "@/lib/db/queries-admin";
import { ChevronLeft, ChevronRight, History } from "lucide-react";
import Link from "next/link";

const validResourceTypes = new Set([
  "restaurant",
  "user",
  "client",
  "commission",
  "systeme",
]);

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string;
    ressource?: string;
    page?: string;
  }>;
}) {
  await getAdminSession();
  const params = await searchParams;
  const page = parsePage(params.page);
  const resourceType = validResourceTypes.has(params.type ?? "")
    ? params.type
    : undefined;
  const resourceId = params.ressource?.trim().slice(0, 100) || undefined;
  const result = await getAuditLogAdmin({
    ressourceType: resourceType,
    ressourceId: resourceId,
    page,
    limit: 25,
  });

  const pageUrl = (nextPage: number) => {
    const query = new URLSearchParams();
    if (resourceType) query.set("type", resourceType);
    if (resourceId) query.set("ressource", resourceId);
    query.set("page", String(nextPage));
    return `?${query.toString()}`;
  };

  return (
    <AdminPage>
      <PageHeader
        title="Journal d’audit"
        description="Historique traçable des validations, suspensions et modifications effectuées par l’administration."
        action={
          <div className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2">
            <History className="size-4 text-muted-foreground" />
            <span className="text-sm font-semibold">
              {result.total.toLocaleString("fr-FR")} action
              {result.total > 1 ? "s" : ""}
            </span>
          </div>
        }
      />

      <AuditAdminFilters
        initialResourceType={resourceType}
        initialResourceId={resourceId}
      />
      <AuditAdminTable rows={result.items} />

      {result.totalPages > 1 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} sur {result.totalPages} — {result.total} résultats
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Button asChild variant="outline">
                <Link href={pageUrl(page - 1)}>
                  <ChevronLeft className="size-4" />
                  Précédent
                </Link>
              </Button>
            )}
            {page < result.totalPages && (
              <Button asChild>
                <Link href={pageUrl(page + 1)}>
                  Suivant
                  <ChevronRight className="size-4" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </AdminPage>
  );
}
