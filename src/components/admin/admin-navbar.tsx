import type { AdminSession } from "@/lib/auth/get-admin-session";
import { Bell, LogOut } from "lucide-react";

interface AdminNavbarProps {
  admin: AdminSession;
}

export function AdminNavbar({ admin }: AdminNavbarProps) {
  const initiales = admin.nom
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-10 shrink-0">
      {/* Gauche : titre de page + badge mode admin */}
      <div className="flex items-center gap-3">
        {/* Info admin */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
            <span className="text-emerald-700 text-base font-bold">
              {initiales}
            </span>
          </div>
          <div className="hidden sm:flex flex-col items-start">
            <span className="text-sm font-semibold text-gray-900 leading-tight">
              {admin.nom}
            </span>
            <span className="text-[11px] text-gray-500 leading-tight">
              {admin.email}
            </span>
          </div>
        </div>
      </div>

      {/* Droite : notifications + profil */}
      <div className="flex items-center gap-3">
        {/* Cloche de notification */}
        <button
          aria-label="Notifications"
          className="relative w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <Bell className="w-4 h-4" />
          {/* Badge rouge si des restaurants sont en attente — géré côté page */}
        </button>

        {/* Séparateur */}
        <div className="h-6 w-px bg-gray-200" />

        {/* Déconnexion */}
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            aria-label="Se déconnecter"
            className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </form>
      </div>
    </header>
  );
}
