"use client";

import { useNotificationsContext } from "@/components/dashboard/notifications/notifications-provider";
import { Button } from "@/components/ui/button";
import { useWebPush } from "@/hooks/use-web-push";
import { getRouteConfig } from "@/lib/config/dashboard-routes";
import { ArrowLeft, Bell, LogOut } from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { MobileSidebar } from "./sidebar";

export default function Navbar({
  user,
  restaurant,
}: {
  user: { nom: string; avatarUrl?: string | null };
  restaurant: { nom: string; logoUrl?: string | null };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const config = getRouteConfig(pathname);

  // Source unique de vérité pour le compteur de notifications : le
  // NotificationsProvider se synchronise automatiquement (SSE + actions
  // markAsRead). La navbar n'a plus son propre fetch ni son propre debounce.
  const { unreadCount } = useNotificationsContext();
  const { isSubscribed, subscribe } = useWebPush();

  const titre = config?.titre ?? "Tableau de bord";
  const showBack = config?.showBackButton ?? false;

  // Web Push subscription on mount
  useEffect(() => {
    if (!isSubscribed) {
      subscribe().catch(console.error);
    }
  }, [isSubscribed, subscribe]);

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        router.push("/login");
      } else {
        console.error("[Navbar] Logout failed:", res.statusText);
      }
    } catch (err) {
      console.error("[Navbar] Failed to logout:", err);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-100 flex items-center justify-between px-3 sm:px-4 lg:px-6 gap-2 sm:gap-4 z-20 lg:left-64 lg:w-[calc(100%-16rem)]">
      {/* Gauche : menu mobile + bouton retour + titre */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className="lg:hidden">
          <MobileSidebar />
        </div>
        {showBack && (
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            onClick={() => router.back()}
            className="shrink-0"
            aria-label="Retour"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Button>
        )}
        <h1 className="truncate text-base font-bold text-gray-900 sm:text-lg">
          {titre}
        </h1>
      </div>

      {/* Droite : notifications + profil */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Cloche notifications */}
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          className="relative"
          onClick={() => router.push("/restaurateur/notifications")}
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5 text-gray-600" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </Button>

        <div className="hidden h-6 w-px bg-gray-200 sm:block" />

        {/* Profil utilisateur */}
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/restaurateur/profil")}
          className="h-auto gap-2 px-1.5 py-1.5 sm:px-2"
        >
          {/* Avatar avec fallback */}
          {user.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt={user.nom}
              width={32}
              height={32}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
              <span className="text-xs font-bold text-white">
                {user.nom
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
            </div>
          )}
          <div className="hidden text-left sm:block">
            <p className="text-sm font-semibold leading-tight text-gray-900">
              {user.nom}
            </p>
            <p className="text-xs text-gray-400">{restaurant.nom}</p>
          </div>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          aria-label="Se déconnecter"
          className="text-muted-foreground hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}
