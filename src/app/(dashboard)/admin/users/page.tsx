import { AdminPage } from "@/components/admin/ui/admin-page";
import { PageHeader } from "@/components/admin/ui/page-header";
import { UsersAdminTable } from "@/components/admin/users-admin-table";
import { getAdminSession } from "@/lib/auth/get-admin-session";
import { parsePage } from "@/lib/config/pagination";
import { getClientsAdmin, getUsersAdmin } from "@/lib/db/queries-admin";
import { Users } from "lucide-react";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; search?: string; page?: string }>;
}) {
  await getAdminSession();

  const searchParamsAwaited = await searchParams;
  const page = parsePage(searchParamsAwaited.page);
  const type =
    searchParamsAwaited.type === "clients" ? "clients" : "restaurateurs";

  const data =
    type === "clients"
      ? await getClientsAdmin({
          search: searchParamsAwaited.search,
          page,
          limit: 20,
        })
      : await getUsersAdmin({
          role: "restaurateur",
          search: searchParamsAwaited.search,
          page,
          limit: 20,
        });

  return (
    <AdminPage>
      <PageHeader
        title="Comptes et accès"
        description="Retrouvez les comptes restaurateurs et clients, puis gérez leur accès à la plateforme."
        action={
          <div className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-semibold text-gray-700">
              {data.total.toLocaleString("fr-FR")}{" "}
              {type === "clients" ? "clients" : "restaurateurs"}
            </span>
          </div>
        }
      />

      <UsersAdminTable
        type={type}
        data={data}
        search={searchParamsAwaited.search}
      />
    </AdminPage>
  );
}
