"use client";

import {
  Building2,
  CalendarRange,
  ExternalLink,
  FileCheck2,
  LayoutDashboard,
  LogOut,
  Menu,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { LogoutConfirmationDialog } from "@/components/shared/logout-confirmation-dialog";
import { AppLogo } from "@/components/ui/app-logo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { PartnerActivityType } from "@/modules/partners/model";

const residenceNavigation = [
  {
    label: "Mes résidences",
    href: "/partenaire/residences",
    icon: Building2,
    description: "Logements et publication",
  },
  {
    label: "Réservations et calendrier",
    href: "/partenaire/reservations",
    icon: CalendarRange,
    description: "Séjours et indisponibilités",
  },
  {
    label: "Vérification d’identité",
    href: "/partenaire/verification",
    icon: FileCheck2,
    description: "Dossier du propriétaire",
  },
  {
    label: "Offre et facturation",
    href: "/partenaire/facturation",
    icon: WalletCards,
    description: "Abonnement et quotas",
  },
] as const;

const restaurantNavigation = [
  {
    label: "Tableau de bord",
    href: "/restaurateur",
    icon: LayoutDashboard,
    description: "Activité du restaurant",
  },
  {
    label: "Vérification d’identité",
    href: "/partenaire/verification",
    icon: FileCheck2,
    description: "Dossier du propriétaire",
  },
  {
    label: "Offre et facturation",
    href: "/restaurateur/facturation",
    icon: WalletCards,
    description: "Abonnement et quotas",
  },
] as const;

function isNavigationItemActive(pathname: string, href: string) {
  if (href === "/partenaire/residences") {
    return (
      pathname.startsWith("/partenaire/residences") ||
      pathname === "/partenaire/onboarding"
    );
  }
  if (href === "/restaurateur") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function PartnerNavigationContent({
  email,
  activityType,
  onNavigate,
}: {
  email: string;
  activityType: PartnerActivityType;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const navigation =
    activityType === "residence" ? residenceNavigation : restaurantNavigation;
  const homeHref =
    activityType === "residence" ? "/partenaire/residences" : "/restaurateur";

  const handleLogout = async () => {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (!response.ok) {
      throw new Error(`Partner logout failed: ${response.statusText}`);
    }
    router.replace("/login");
    router.refresh();
  };

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="border-b px-5 py-5">
        <AppLogo
          href={homeHref}
          alt="Toutci"
          iconSizeClassName="size-10"
          textSizeClassName="w-24"
          textVisibilityClassName="block"
        />
        <div className="mt-4 flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-500" />
          <p className="text-sm font-semibold text-slate-900">
            {activityType === "residence"
              ? "Espace Résidences"
              : "Espace Restaurant"}
          </p>
        </div>
      </div>

      <nav
        aria-label="Navigation partenaire"
        className="flex-1 space-y-1 overflow-y-auto px-3 py-5"
      >
        {navigation.map((item) => {
          const active = isNavigationItemActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-start gap-3 rounded-xl px-3 py-3 transition-colors",
                active
                  ? "bg-emerald-950 text-white"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-950",
              )}
            >
              <Icon
                className={cn(
                  "mt-0.5 size-5 shrink-0",
                  active ? "text-emerald-300" : "text-slate-400",
                )}
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{item.label}</span>
                <span
                  className={cn(
                    "mt-0.5 block text-xs leading-5",
                    active ? "text-emerald-100" : "text-slate-500",
                  )}
                >
                  {item.description}
                </span>
              </span>
            </Link>
          );
        })}

        <div className="mx-3 my-4 border-t" />
        {activityType === "residence" ? (
          <Link
            href="/residences"
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950"
          >
            <ExternalLink className="size-4 text-slate-400" />
            Voir le catalogue public
          </Link>
        ) : null}
      </nav>

      <div className="border-t p-4">
        <div className="mb-3 min-w-0 px-2">
          <p className="text-xs font-medium text-slate-500">Compte connecté</p>
          <p className="mt-1 truncate text-sm font-semibold text-slate-900">
            {email}
          </p>
        </div>
        <LogoutConfirmationDialog onConfirm={handleLogout}>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start gap-2 text-slate-700 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
          >
            <LogOut className="size-4" />
            Changer de compte
          </Button>
        </LogoutConfirmationDialog>
      </div>
    </div>
  );
}

export function PartnerNavigation({
  email,
  activityType,
}: {
  email: string;
  activityType: PartnerActivityType;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const homeHref =
    activityType === "residence" ? "/partenaire/residences" : "/restaurateur";
  const spaceLabel =
    activityType === "residence" ? "Résidences" : "Restaurant";

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r lg:block">
        <PartnerNavigationContent email={email} activityType={activityType} />
      </aside>

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white px-4 lg:hidden">
        <AppLogo
          href={homeHref}
          alt="Toutci"
          iconSizeClassName="size-9"
          textSizeClassName="w-20"
          textVisibilityClassName="block"
        />
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button type="button" variant="outline" size="icon" aria-label="Ouvrir le menu partenaire">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[min(88vw,18rem)] gap-0 p-0" showCloseButton>
            <SheetHeader className="sr-only">
              <SheetTitle>Menu partenaire</SheetTitle>
              <SheetDescription>
                Navigation et gestion du compte {spaceLabel}
              </SheetDescription>
            </SheetHeader>
            <PartnerNavigationContent
              email={email}
              activityType={activityType}
              onNavigate={() => setMobileOpen(false)}
            />
          </SheetContent>
        </Sheet>
      </header>
    </>
  );
}
