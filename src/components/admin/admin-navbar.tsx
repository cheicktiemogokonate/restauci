"use client";

import { Bell, LogOut } from "lucide-react";
import { LogoutConfirmationDialog } from "@/components/shared/logout-confirmation-dialog";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function AdminNavbar() {
  const router = useRouter();

  const handleLogout = async () => {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (!response.ok) {
      throw new Error(`Admin logout failed: ${response.statusText}`);
    }

    router.replace("/login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b bg-white px-4 sm:px-6">
      <div className="flex items-center gap-2">
        <SidebarTrigger aria-label="Afficher ou réduire la navigation" />
        <p className="text-sm font-medium text-muted-foreground">Administration</p>
      </div>

      {/* Droite : notifications + profil */}
      <div className="flex items-center gap-3">
        {/* Cloche de notification */}
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground"
        >
          <Link href="/admin/a-traiter" aria-label="Voir les actions à traiter">
            <Bell className="w-4 h-4" />
          </Link>
        </Button>

        {/* Séparateur */}
        <div className="h-6 w-px bg-gray-200" />

        {/* Déconnexion */}
        <LogoutConfirmationDialog onConfirm={handleLogout}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Se déconnecter"
            className="gap-2 text-muted-foreground hover:border-red-200 hover:bg-red-50 hover:text-red-700"
          >
            <LogOut className="w-4 h-4" />
            <span>Changer de compte</span>
          </Button>
        </LogoutConfirmationDialog>
      </div>
    </header>
  );
}
