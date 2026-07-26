import { Bell, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function AdminNavbar() {
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
        <form action="/api/auth/logout" method="POST">
          <Button
            type="submit"
            variant="ghost"
            size="icon"
            aria-label="Se déconnecter"
            className="text-muted-foreground hover:bg-red-50 hover:text-red-700"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </header>
  );
}
