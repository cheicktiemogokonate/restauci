import { AdminPage } from "@/components/admin/ui/admin-page";
import { PageHeader } from "@/components/admin/ui/page-header";
import { AdminAccountsManager } from "@/components/admin/admin-accounts-manager";
import { UsersAdminTable } from "@/components/admin/users-admin-table";
import { getAdminSession } from "@/modules/auth/server";
import { parsePage } from "@/shared/pagination";
import { listAdminClients } from "@/modules/clients/server";
import { listAdminAccounts } from "@/modules/admin-accounts/server";
import type {
  AdminPartnerAccessDTO,
  AdminPartnerAccessPageDTO,
} from "@/modules/partners/contracts";
import { listAdminPartnerOwners } from "@/modules/partners/server";
import { getAdminRestaurantAccountSummary } from "@/modules/restaurants/server";
import { getAdminResidenceAccountSummary } from "@/modules/residences/server";
import { Users } from "lucide-react";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; search?: string; page?: string }>;
}) {
  const admin = await getAdminSession();

  const searchParamsAwaited = await searchParams;
  const page = parsePage(searchParamsAwaited.page);
  const type = searchParamsAwaited.type === "clients"
    ? "clients"
    : searchParamsAwaited.type === "administrateurs"
      ? "administrateurs"
      : "partenaires";

  let data = null;
  if (type === "clients") {
    data = await listAdminClients({
          search: searchParamsAwaited.search,
          page,
          limit: 20,
        });
  } else if (type === "partenaires") {
    const owners = await listAdminPartnerOwners({
      search: searchParamsAwaited.search,
      page,
      limit: 20,
    });
    const items = await Promise.all(
      owners.items.map(async (owner): Promise<AdminPartnerAccessDTO> => {
        const base = {
          userId: owner.userId,
          name: owner.name,
          email: owner.email,
          phone: owner.phone,
          suspended: owner.suspended,
          createdAt: owner.createdAt,
          subscription: owner.subscription,
        };
        if (!owner.partnerAccount) {
          return {
            ...base,
            activityType: null,
            partnerAccountId: null,
            onboardingState: "activity_pending",
          };
        }
        if (owner.partnerAccount.activityType === "restaurant") {
          const restaurant = await getAdminRestaurantAccountSummary(
            owner.partnerAccount.id,
          );
          return {
            ...base,
            activityType: "restaurant",
            partnerAccountId: owner.partnerAccount.id,
            onboardingState: restaurant ? "complete" : "entity_pending",
            restaurant,
          };
        }
        const residenceAccount = await getAdminResidenceAccountSummary(
          owner.partnerAccount.id,
        );
        return {
          ...base,
          activityType: "residence",
          partnerAccountId: owner.partnerAccount.id,
          onboardingState:
            residenceAccount.residences.length > 0
              ? "complete"
              : "entity_pending",
          residenceAccount,
        };
      }),
    );
    data = {
      ...owners,
      items,
    } satisfies AdminPartnerAccessPageDTO;
  }
  const adminAccounts = type === "administrateurs"
    ? await listAdminAccounts(searchParamsAwaited.search)
    : null;

  return (
    <AdminPage>
      <PageHeader
        title="Comptes et accès"
        description="Retrouvez les comptes partenaires, clients et administrateurs, puis gérez leur accès à la plateforme."
        action={
          <div className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-semibold text-gray-700">
              {(adminAccounts?.length ?? data?.total ?? 0).toLocaleString("fr-FR")}{" "}
              {type === "clients"
                ? "clients"
                : type === "administrateurs"
                  ? "administrateurs"
                  : "partenaires"}
            </span>
          </div>
        }
      />

      {type === "administrateurs" && adminAccounts ? (
        <AdminAccountsManager
          accounts={adminAccounts}
          currentAdminId={admin.userId}
          search={searchParamsAwaited.search}
        />
      ) : data ? (
        <UsersAdminTable
          type={type}
          data={data}
          search={searchParamsAwaited.search}
        />
      ) : null}
    </AdminPage>
  );
}
