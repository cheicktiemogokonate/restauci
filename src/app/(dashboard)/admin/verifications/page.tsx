import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { AdminPage } from "@/components/admin/ui/admin-page";
import { PageHeader } from "@/components/admin/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IdentityStatusBadge } from "@/modules/identity/presentation/identity-status-badge";
import { getAdminSession } from "@/modules/auth/server";
import { listIdentityVerifications } from "@/modules/identity/server";
import type { IdentityVerificationStatus } from "@/modules/identity/model";

const validStatuses = new Set<IdentityVerificationStatus>(["not_submitted", "pending", "verified", "rejected"]);

export default async function AdminIdentityVerificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; page?: string }>;
}) {
  await getAdminSession();
  const params = await searchParams;
  const status = validStatuses.has(params.status as IdentityVerificationStatus)
    ? params.status as IdentityVerificationStatus
    : undefined;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const result = await listIdentityVerifications({ status, search: params.search, page, limit: 20 });

  return (
    <AdminPage>
      <PageHeader
        title="Vérifications d’identité"
        description="Contrôlez l’identité des propriétaires de comptes partenaires, quelle que soit leur activité."
        action={<div className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2"><ShieldCheck className="size-4 text-emerald-600" /><span className="text-sm font-semibold">{result.total} dossiers</span></div>}
      />

      <form className="flex flex-col gap-3 rounded-xl border bg-white p-4 sm:flex-row" method="get">
        <Input name="search" defaultValue={params.search} placeholder="Nom ou e-mail" className="sm:max-w-sm" />
        <select name="status" defaultValue={status ?? ""} className="h-9 rounded-lg border border-input bg-white px-3 text-sm">
          <option value="">Tous les statuts</option>
          <option value="pending">En vérification</option>
          <option value="verified">Vérifiés</option>
          <option value="rejected">À corriger</option>
          <option value="not_submitted">Non soumis</option>
        </select>
        <Button type="submit">Filtrer</Button>
      </form>

      <div className="overflow-hidden rounded-xl border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-4 py-3">Propriétaire</th><th className="px-4 py-3">Activité</th><th className="px-4 py-3">Statut</th><th className="px-4 py-3">Soumis le</th><th className="px-4 py-3 text-right">Action</th></tr>
            </thead>
            <tbody className="divide-y">
              {result.items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-4"><p className="font-medium text-slate-950">{item.legalName ?? item.accountName}</p><p className="text-xs text-slate-500">{item.accountEmail}</p></td>
                  <td className="px-4 py-4 capitalize">{item.activityType === "restaurant" ? "Restaurant" : "Résidence"}</td>
                  <td className="px-4 py-4"><IdentityStatusBadge status={item.status} /></td>
                  <td className="px-4 py-4 text-slate-600">{item.submittedAt ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(item.submittedAt)) : "—"}</td>
                  <td className="px-4 py-4 text-right"><Button asChild variant="outline" size="sm"><Link href={`/admin/verifications/${item.id}`}>Examiner</Link></Button></td>
                </tr>
              ))}
              {result.items.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-500">Aucun dossier ne correspond à ces filtres.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {result.totalPages > 1 && (
        <div className="flex items-center justify-end gap-3 text-sm">
          <Button asChild variant="outline" size="sm" disabled={page <= 1}><Link href={{ pathname: "/admin/verifications", query: { ...(status && { status }), ...(params.search && { search: params.search }), page: Math.max(1, page - 1) } }}>Précédent</Link></Button>
          <span>Page {page} sur {result.totalPages}</span>
          <Button asChild variant="outline" size="sm" disabled={page >= result.totalPages}><Link href={{ pathname: "/admin/verifications", query: { ...(status && { status }), ...(params.search && { search: params.search }), page: Math.min(result.totalPages, page + 1) } }}>Suivant</Link></Button>
        </div>
      )}
    </AdminPage>
  );
}
