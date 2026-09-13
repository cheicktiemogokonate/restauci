"use client";

import {
  BadgeDollarSign,
  Building2,
  CreditCard,
  History,
  LayoutDashboard,
  LifeBuoy,
  ListChecks,
  MapPinned,
  Settings2,
  ShieldCheck,
  Store,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppLogo } from "@/components/ui/app-logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { label: "Vue d'ensemble", href: "/admin", icon: LayoutDashboard },
  { label: "À traiter", href: "/admin/a-traiter", icon: ListChecks },
  { label: "Restaurants", href: "/admin/restaurants", icon: Store },
  { label: "Résidences", href: "/admin/residences", icon: Building2 },
  { label: "Zones de service", href: "/admin/zones", icon: MapPinned },
  { label: "Vérifications", href: "/admin/verifications", icon: ShieldCheck },
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

export function AdminSidebar({
  adminNom = "Admin",
  adminEmail,
  actionsEnAttente = 0,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const initials = adminNom
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Sidebar collapsible="icon" aria-label="Navigation administrateur">
      <SidebarHeader className="border-b p-3">
        <div className="flex h-10 items-center gap-2 overflow-hidden px-1">
          <AppLogo
            href="/admin"
            alt="Toutci"
            iconSizeClassName="size-8"
            textSizeClassName="w-24"
            textVisibilityClassName="group-data-[collapsible=icon]:hidden"
          />
          <span className="rounded-md bg-emerald-50 px-1.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-emerald-700 group-data-[collapsible=icon]:hidden">
            Admin
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Administration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/admin" && pathname.startsWith(item.href)) ||
                  (item.href === "/admin/support" &&
                    pathname.startsWith("/admin/commandes"));
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                      className="h-10 data-active:bg-emerald-50 data-active:text-emerald-800"
                    >
                      <Link
                        href={item.href}
                        prefetch
                        aria-current={active ? "page" : undefined}
                        onClick={() => setOpenMobile(false)}
                      >
                        <Icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                    {item.href === "/admin/a-traiter" &&
                      actionsEnAttente > 0 && (
                        <SidebarMenuBadge className="bg-destructive text-destructive-foreground">
                          {actionsEnAttente}
                        </SidebarMenuBadge>
                      )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip={`${adminNom} — Administrateur`}
              className="cursor-default"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-xs font-bold text-emerald-800">
                {initials}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-semibold">{adminNom}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {adminEmail ?? "Administrateur"}
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
