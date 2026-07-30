"use client";

import { Bell, LogOut } from "lucide-react";
import { LogoutConfirmationDialog } from "@/components/shared/logout-confirmation-dialog";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function AdminNavbar() {
  const router = useRouter();

  const handleLogout = async () => {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (!response.ok) {
      throw new Error(`Admin logout failed: ${response.statusText}`);
    }

    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b bg-white pr-4 pl-14 sm:pr-6 md:px-6">
      <p className="text-sm font-medium text-muted-foreground">Administration</p>

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
            variant="ghost"
            size="icon"
            aria-label="Se déconnecter"
            className="text-muted-foreground hover:bg-red-50 hover:text-red-700"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </LogoutConfirmationDialog>
      </div>
    </header>
  );
}
