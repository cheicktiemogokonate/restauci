import { AdminNavbar } from "@/components/admin/admin-navbar";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { getAdminSession } from "@/lib/auth/get-admin-session";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Vérifie session + role admin — redirige automatiquement sinon
  const admin = await getAdminSession();
  if (!admin) redirect("/login");

  return (
    <div className="flex h-screen bg-[#FAFAFA] overflow-hidden">
      {/* Sidebar reçoit les vraies infos admin */}
      <AdminSidebar adminNom={admin.nom} adminEmail={admin.email} />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <AdminNavbar admin={admin} />
        <main className="flex-1 relative">{children}</main>
      </div>
    </div>
  );
}
