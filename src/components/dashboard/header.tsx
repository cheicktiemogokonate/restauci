"use client";

import { Search, Bell, Settings, ChevronDown, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MobileSidebar } from "./sidebar";

interface HeaderProps {
  title?: string;
  subtitle?: string;
  breadcrumb?: { label: string; href?: string }[];
  backHref?: string;
}

export function Header({ title, subtitle, breadcrumb, backHref }: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b border-border bg-card px-4 lg:px-6 fixed z-30 shadow-[4px_0_24px_rgba(0,0,0,0.02)] inset-x-0 lg:left-64">
      <div className="flex items-center gap-4">
        <MobileSidebar />
        <div className="hidden sm:block">
          {breadcrumb ? (
            <div>
              <div className="flex items-center gap-2">
                {backHref && (
                  <Link href={backHref} className="text-foreground hover:text-muted-foreground transition-colors">
                    <ArrowLeft className="h-5 w-5" />
                  </Link>
                )}
                <h1 className="text-xl font-semibold text-foreground">{title || "RestauCI"}</h1>
              </div>
              <nav className="flex items-center gap-1 text-[13px] mt-0.5 text-muted-foreground">
                {breadcrumb.map((item, index) => (
                  <span key={item.label} className="flex items-center gap-1">
                    {index > 0 && <span className="mx-1 text-muted-foreground/50">{">"}</span>}
                    <span className={index === breadcrumb.length - 1 ? "text-[#2d7d46] font-medium" : ""}>
                      {item.href ? (
                        <Link href={item.href} className="hover:text-foreground transition-colors">{item.label}</Link>
                      ) : (
                        item.label
                      )}
                    </span>
                  </span>
                ))}
              </nav>
            </div>
          ) : (
            <div>
              <h1 className="text-lg font-semibold text-foreground">{title || "RestauCI"}</h1>
              <p className="text-sm text-muted-foreground">{subtitle || "Hello Orlando, welcome back!"}</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center max-w-md mx-4">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Rechercher une commande, un client..."
            className="w-full pl-9 pr-12 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5 rounded-full bg-primary" />
          <span className="sr-only">Notifications</span>
        </Button>

        <Button variant="ghost" size="icon" className="hidden sm:inline-flex">
          <Settings className="h-5 w-5" />
          <span className="sr-only">Settings</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face" alt="Orlando" />
                <AvatarFallback>OL</AvatarFallback>
              </Avatar>
              <div className="hidden text-left md:block">
                <p className="text-sm font-medium">Orlando Laurentius</p>
                <p className="text-xs text-muted-foreground">Administrateur</p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground hidden md:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Mon Compte</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profil</DropdownMenuItem>
            <DropdownMenuItem>Parametres</DropdownMenuItem>
            <DropdownMenuItem>Facturation</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">Deconnexion</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
