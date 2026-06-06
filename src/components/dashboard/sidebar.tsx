"use client";

import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ClipboardList,
  MessageSquare,
  Calendar,
  UtensilsCrossed,
  Package,
  Users,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronDown,
  Menu,
  Sparkles,
  LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
  hasSubmenu?: boolean;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/restaurateur", icon: LayoutDashboard },
  { label: "Commandes", href: "/restaurateur/commandes", icon: ClipboardList },
  // { label: "Messages", href: "/restaurateur/messages", icon: MessageSquare, badge: 5 },
  // { label: "Calendrier", href: "/restaurateur/calendrier", icon: Calendar },
  { label: "Menu", href: "/restaurateur/menu", icon: UtensilsCrossed },
  // { label: "Inventaire", href: "/restaurateur/inventaire", icon: Package, hasSubmenu: true },
  // { label: "Clients", href: "/restaurateur/clients", icon: Users },
  // { label: "Rapports", href: "/restaurateur/rapports", icon: BarChart3 },
  // { label: "Parametres", href: "/restaurateur/parametres", icon: Settings },
];

function Logo({ collapsed }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2 px-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-green">
        <UtensilsCrossed className="h-5 w-5 text-primary-foreground" />
      </div>
      {!collapsed && (
        <span className="text-xl font-bold text-foreground">RestauCI</span>
      )}
    </div>
  );
}

function NavLinks({ collapsed, onItemClick, currentPath }: { collapsed?: boolean; onItemClick?: () => void; currentPath: string }) {
  return (
    <nav className="flex flex-col gap-1 px-2">
      {navItems.map((item) => {
        const isActive = currentPath === item.href || (item.href !== "/restaurateur" && currentPath.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onItemClick}
            className={cn(
              "flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-brand-green text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <div className="flex items-center gap-3">
              <item.icon className={cn("h-5 w-5", collapsed && "mx-auto")} />
              {!collapsed && <span>{item.label}</span>}
            </div>
            {!collapsed && item.badge && (
              <Badge 
                variant="secondary" 
                className={cn(
                  "h-5 min-w-5 px-1.5 text-xs",
                  isActive ? "bg-brand-green-foreground/20 text-primary-foreground" : "bg-brand-green text-primary-foreground"
                )}
              >
                {item.badge}
              </Badge>
            )}
            {!collapsed && item.hasSubmenu && (
              <ChevronDown className={cn("h-4 w-4", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function ProCard({ collapsed }: { collapsed?: boolean }) {
  if (collapsed) return null;
  
  return (
    <div className="mx-3 rounded-xl bg-muted/50 p-4">
      <div className="mb-3 aspect-video rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden">
        <img 
          src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=300&h=200&fit=crop" 
          alt="Restaurant" 
          className="w-full h-full object-cover rounded-lg"
        />
      </div>
      <p className="text-sm text-muted-foreground mb-3">
        Gerez votre restaurant plus efficacement avec <span className="font-semibold text-brand-green">RestauCI</span>.
      </p>
      <Button className="w-full gap-2 bg-brand-green" size="sm">
        <Sparkles className="h-4 w-4" />
        Passer au Pro
      </Button>
    </div>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      // className={cn(
      //   "hidden lg:flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
      //   collapsed ? "w-[72px]" : "w-[260px]"
      // )}
      className="hidden lg:flex w-64 fixed inset-y-0 left-0 bg-white border-r border-[#EAEAEA] flex flex-col justify-between z-30 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
    
    
      <div className="flex h-16 items-center justify-between px-4">
        <Logo collapsed={collapsed} />
        {!collapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="flex-1 py-4 overflow-y-auto">
        <NavLinks collapsed={collapsed} currentPath={pathname} />
      </div>
      <div className="pb-4">
        <ProCard collapsed={collapsed} />
      </div>
      {collapsed && (
        <div className="pb-4 px-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(false)}
            className="h-8 w-8 mx-auto"
          >
            <ChevronLeft className="h-4 w-4 rotate-180" />
          </Button>
        </div>
      )}
    </aside>
  );
}

export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[260px] p-0">
        <div className="flex h-16 items-center px-4">
          <Logo />
        </div>
        <div className="py-4 flex-1">
          <NavLinks onItemClick={() => setOpen(false)} currentPath={pathname} />
        </div>
        <div className="pb-4">
          <ProCard collapsed={false} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
