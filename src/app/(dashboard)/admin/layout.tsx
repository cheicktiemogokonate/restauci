import { AdminNavbar } from "@/components/admin/admin-navbar";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { getAdminSession } from "@/lib/auth/get-admin-session";
import { getAdminActionCenterSummary } from "@/lib/db/queries-admin";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Vérifie session + role admin — redirige automatiquement sinon
  const admin = await getAdminSession();

  // Le badge ne doit pas rendre toute l'administration indisponible si cette
  // lecture secondaire échoue temporairement.
  const actionsEnAttente = await getAdminActionCenterSummary()
    .then((summary) => summary.requiredActions)
    .catch(() => 0);

  return (
    <div className="flex h-dvh bg-[#FAFAFA] overflow-hidden">
      {/* Sidebar reçoit les vraies infos admin */}
      <AdminSidebar
        adminNom={admin.nom}
        adminEmail={admin.email}
        actionsEnAttente={actionsEnAttente}
      />
      <div className="flex-1 flex flex-col min-w-0 h-dvh overflow-y-auto">
        <AdminNavbar />
        <main className="flex-1 relative">{children}</main>
      </div>
    </div>
  );
}
