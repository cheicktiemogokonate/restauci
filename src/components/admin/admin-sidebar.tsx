"use client";

import {
  BadgeDollarSign,
  CreditCard,
  History,
  LayoutDashboard,
  LifeBuoy,
  ListChecks,
  Settings2,
  Store,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Drawer } from "@/components/motion/drawer";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { AppLogo } from "@/components/ui/app-logo";

const navItems = [
  { label: "Vue d'ensemble", href: "/admin", icon: LayoutDashboard },
  { label: "À traiter", href: "/admin/a-traiter", icon: ListChecks },
  { label: "Restaurants", href: "/admin/restaurants", icon: Store },
  { label: "Comptes et accès", href: "/admin/users", icon: Users },
  { label: "Support", href: "/admin/support", icon: LifeBuoy },
  { label: "Finance", href: "/admin/commissions", icon: BadgeDollarSign },
  { label: "Abonnements", href: "/admin/abonnements", icon: CreditCard },
  { label: "Journal d’audit", href: "/admin/audit", icon: History },
  { label: "Paramètres", href: "/admin/parametres", icon: Settings2 },
];

interface AdminSidebarProps {
  adminNom?: string;
  adminEmail?: string;
  actionsEnAttente?: number;
}

interface NavListProps extends AdminSidebarProps {
  onNavigate?: () => void;
}

function NavList({
  adminNom = "Admin",
  adminEmail,
  actionsEnAttente = 0,
  onNavigate,
}: NavListProps) {
  const pathname = usePathname();
  const initiales = adminNom
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className="w-[260px] shrink-0 bg-white border-r border-gray-200 flex flex-col h-full overflow-y-auto">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-6 border-b border-gray-100">
        <AppLogo
          href="/admin"
          alt="Toutci"
          iconSizeClassName="size-9"
          textSizeClassName="w-24"
          textVisibilityClassName="block"
        />
        <span className="rounded-md bg-emerald-50 px-1.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-emerald-700">
          Admin
        </span>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-3 py-2">
        <nav className="space-y-0.5">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href)) ||
              (item.href === "/admin/support" &&
                pathname.startsWith("/admin/commandes"));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                onClick={onNavigate}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                  isActive
                    ? "bg-emerald-50 text-emerald-700 shadow-[inset_0_0_0_1px_rgba(5,150,105,0.15)]"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 ${
                    isActive ? "text-emerald-600" : "text-gray-400"
                  }`}
                />
                <span className="flex-1">{item.label}</span>
                {item.href === "/admin/a-traiter" &&
                  actionsEnAttente > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-bold text-white bg-red-500 rounded-full">
                      {actionsEnAttente}
                    </span>
                  )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Profil admin */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-gray-50 transition-colors cursor-default">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
            <span className="text-emerald-700 font-bold text-sm">
              {initiales}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 leading-tight truncate">
              {adminNom}
            </p>
            {adminEmail && (
              <p className="text-xs text-gray-500 truncate">{adminEmail}</p>
            )}
            <p className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wide">
              Administrateur
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function AdminSidebar(props: AdminSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Version desktop */}
      <div className="hidden md:flex">
        <NavList {...props} />
      </div>

      {/* Version mobile : drawer */}
      <div className="w-0 md:hidden">
        <Button
          variant="outline"
          size="icon"
          aria-label="Ouvrir le menu"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(true)}
          className="fixed left-3 top-3 z-30 bg-white"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Drawer
          open={mobileOpen}
          onOpenChange={setMobileOpen}
          side="left"
          ariaLabel="Navigation administrateur"
          className="w-[260px] p-0"
        >
          <NavList {...props} onNavigate={() => setMobileOpen(false)} />
        </Drawer>
      </div>
    </>
  );
}
