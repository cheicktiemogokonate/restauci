import { AdminNavbar } from "@/components/admin/admin-navbar";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { getAdminSession } from "@/modules/auth/server";
import { getAdminActionCenter } from "@/modules/admin-projections/server";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Vérifie session + role admin — redirige automatiquement sinon
  const admin = await getAdminSession();

  // Le badge ne doit pas rendre toute l'administration indisponible si cette
  // lecture secondaire échoue temporairement.
  const actionsEnAttente = await getAdminActionCenter()
    .then((summary) => summary.requiredActions)
    .catch(() => 0);

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AdminSidebar
          adminNom={admin.nom}
          adminEmail={admin.email}
          actionsEnAttente={actionsEnAttente}
        />
        <SidebarInset className="h-dvh min-w-0 overflow-y-auto bg-[#FAFAFA]">
          <AdminNavbar />
          <div className="relative flex-1">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
