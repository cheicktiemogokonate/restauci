import { getAdminSession } from "@/lib/auth/get-admin-session";
import { getUsersAdmin, getClientsAdmin } from "@/lib/db/queries-admin";
import { parsePage } from "@/lib/config/pagination";
import { UsersAdminTable } from "@/components/admin/users-admin-table";
import { Users } from "lucide-react";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { type?: string; search?: string; page?: string };
}) {
  await getAdminSession();

  const searchParamsAwaited = await searchParams;
  const page = parsePage(searchParamsAwaited.page);
  const type = searchParamsAwaited.type ?? "restaurateurs";

  const data =
    type === "clients"
      ? await getClientsAdmin({ search: searchParamsAwaited.search, page, limit: 20 })
      : await getUsersAdmin({ role: "restaurateur", search: searchParamsAwaited.search, page, limit: 20 });

  return (
    <div className="p-6 lg:p-8 space-y-6 bg-[#FAFAFA] min-h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Utilisateurs</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Gérez les restaurateurs et les clients de la plateforme
          </p>
        </div>
        <div className="flex items-center gap-2 px-3.5 py-2 bg-white border border-gray-200 rounded-xl shadow-sm">
          <Users className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-700">
            {data.total.toLocaleString("fr-FR")} {type === "clients" ? "clients" : "restaurateurs"}
          </span>
        </div>
      </div>

      <UsersAdminTable type={type} data={data} search={searchParamsAwaited.search} />
    </div>
  );
}
