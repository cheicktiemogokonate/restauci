"use client";

import { useWebPush } from "@/hooks/use-web-push";
import { getRouteConfig } from "@/lib/config/dashboard-routes";
import { ArrowLeft, Bell, LogOut } from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface NavbarProps {
  user: {
    nom: string;
    avatarUrl?: string | null;
  };
  restaurant: {
    nom: string;
    logoUrl?: string | null;
  };
  notificationsCount?: number;
}

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

  const [notificationsCount, setNotificationsCount] = useState(0);
  const { isSubscribed, subscribe } = useWebPush();

  const titre = config?.titre ?? "Tableau de bord";
  const showBack = config?.showBackButton ?? false;
  const parentPath = config?.parentPath ?? "/restaurateur";

  // Web Push subscription on mount
  useEffect(() => {
    if (!isSubscribed) {
      subscribe().catch(console.error);
    }
  }, [isSubscribed, subscribe]);

  // Poll notification count every 30 seconds
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await fetch("/api/notifications/count");
        if (res.ok) {
          const data = await res.json();
          setNotificationsCount(data.count);
        }
      } catch (err) {
        console.error("[Navbar] Failed to fetch notification count:", err);
      }
    };

    // Fetch on mount
    fetchCount();

    // Set interval
    const interval = setInterval(fetchCount, 30000);

    return () => clearInterval(interval);
  }, []);

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
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 gap-4 z-20 lg:left-64 lg:w-[calc(100%-16rem)]">
      {/* Gauche : bouton retour + titre */}
      <div className="flex items-center gap-3">
        {showBack && (
          <button
            onClick={() => router.push(parentPath)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Retour"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
        )}
        <h1 className="text-xl font-bold text-gray-900">{titre}</h1>
      </div>

      {/* Droite : notifications + profil */}
      <div className="flex items-center gap-3">
        {/* Cloche notifications */}
        <button
          className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
          onClick={() => router.push("/restaurateur/notifications")}
        >
          <Bell className="w-5 h-5 text-gray-600" />
          {notificationsCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </button>

        <div className="w-px h-6 bg-gray-200" />

        {/* Profil utilisateur */}
        <button
          onClick={() => router.push("/restaurateur/profil")}
          className="flex items-center gap-2 hover:bg-gray-50 rounded-xl px-2 py-1.5 transition-colors"
        >
          {/* Avatar avec fallback */}
          {user.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt={user.nom}
              width={32}
              height={32}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#2d7d46] flex items-center justify-center shrink-0">
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
          <div className="text-left hidden md:block">
            <p className="text-sm font-semibold text-gray-900 leading-tight">
              {user.nom}
            </p>
            <p className="text-xs text-gray-400">{restaurant.nom}</p>
          </div>
        </button>
        <button
          type="submit"
          aria-label="Se déconnecter"
          className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
