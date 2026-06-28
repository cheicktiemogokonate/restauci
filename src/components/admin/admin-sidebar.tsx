"use client";

import {
  BadgeDollarSign,
  LayoutDashboard,
  Receipt,
  ShieldCheck,
  Store,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Vue d'ensemble", href: "/admin", icon: LayoutDashboard },
  { label: "Restaurants", href: "/admin/restaurants", icon: Store },
  { label: "Commandes", href: "/admin/commandes", icon: Receipt },
  { label: "Utilisateurs", href: "/admin/users", icon: Users },
  { label: "Commissions", href: "/admin/commissions", icon: BadgeDollarSign },
];

interface AdminSidebarProps {
  adminNom?: string;
  adminEmail?: string;
}

export function AdminSidebar({
  adminNom = "Admin",
  adminEmail,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const initiales = adminNom
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className="w-[260px] shrink-0 bg-white border-r border-gray-200 flex flex-col h-full overflow-y-auto hidden md:flex">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-6 py-6 border-b border-gray-100">
        <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center shadow-sm">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <span className="text-xl font-bold text-gray-900 tracking-tight">
          Restau<span className="text-emerald-600">CI</span>
          <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            Admin
          </span>
        </span>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-3 py-2">
        <nav className="space-y-0.5">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
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
                {item.label}
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
              Super Admin
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
