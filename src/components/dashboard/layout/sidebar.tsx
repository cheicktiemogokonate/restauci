"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ClipboardList,
  CookingPot,
  LayoutDashboard,
  LucideIcon,
  Menu,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

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
  { label: "Menu", href: "/restaurateur/menu", icon: CookingPot },
];

function Logo({ restauName = "RestauCI" }: { restauName?: string }) {
  return (
    <div className="flex items-center gap-2 px-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-green">
        <UtensilsCrossed className="h-5 w-5 text-primary-foreground" />
      </div>
      {<span className="text-xl font-bold text-foreground">{restauName}</span>}
    </div>
  );
}

function NavLinks({
  onItemClick,
  currentPath,
}: {
  onItemClick?: () => void;
  currentPath: string;
}) {
  return (
    <nav className="flex flex-col gap-1 px-2">
      {navItems.map((item) => {
        const isActive =
          currentPath === item.href ||
          (item.href !== "/restaurateur" && currentPath.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={true}
            onClick={onItemClick}
            className={cn(
              "flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-brand-green text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <div className="flex items-center gap-3">
              <item.icon className={cn("h-5 w-5 mx-auto")} />
              <span>{item.label}</span>
            </div>
            {item.badge && (
              <Badge
                variant="secondary"
                className={cn(
                  "h-5 min-w-5 px-1.5 text-xs",
                  isActive
                    ? "bg-brand-green-foreground/20 text-primary-foreground"
                    : "bg-brand-green text-primary-foreground",
                )}
              >
                {item.badge}
              </Badge>
            )}
            {item.hasSubmenu && (
              <ChevronDown
                className={cn(
                  "h-4 w-4",
                  isActive
                    ? "text-primary-foreground"
                    : "text-muted-foreground",
                )}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function ProCard() {
  return (
    <div className="mx-3 rounded-xl bg-muted/50 p-4">
      <div className="mb-3 aspect-video rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden">
        <Sparkles className="h-8 w-8 text-brand-green/60" />
      </div>
      <p className="text-sm text-muted-foreground mb-3">
        Gerez votre restaurant plus efficacement avec{" "}
        <span className="font-semibold text-brand-green">RestauCI</span>.
      </p>
      <Button className="w-full gap-2 bg-brand-green" size="sm">
        <Sparkles className="h-4 w-4" />
        Passer au Pro
      </Button>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-64 fixed inset-y-0 left-0 bg-white border-r border-[#EAEAEA] flex flex-col justify-between z-30 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
      <div className="flex h-16 items-center justify-between px-4">
        <Logo />
      </div>
      <div className="flex-1 py-4 overflow-y-auto">
        <NavLinks currentPath={pathname} />
      </div>
      <div className="pb-4">
        <ProCard />
      </div>
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
        <SheetTitle className="sr-only">Menu de navigation</SheetTitle>
        <div className="flex h-16 items-center px-4">
          <Logo />
        </div>
        <div className="py-4 flex-1">
          <NavLinks onItemClick={() => setOpen(false)} currentPath={pathname} />
        </div>
        <div className="pb-4">
          <ProCard />
        </div>
      </SheetContent>
    </Sheet>
  );
}
