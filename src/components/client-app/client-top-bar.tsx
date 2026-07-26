"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { GeolocationStatus } from "@/lib/client-app/hooks/use-geolocation";
import { useAuthStore } from "@/lib/client-app/stores/auth-store";
import { LocateFixed, MapPin, Search, UserRound } from "lucide-react";
import Link from "next/link";

interface ClientTopBarProps {
  geoStatus: GeolocationStatus;
  onDemanderGeolocation: () => void;
  nombreResultats: number;
  isLoading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  cuisine: string | null;
  onCuisineChange: (value: string | null) => void;
}

const cuisines = ["Tout", "Africaine", "Pizza", "Fast food", "Pâtisserie", "Boissons"];

export function ClientTopBar({
  geoStatus,
  onDemanderGeolocation,
  nombreResultats,
  isLoading,
  search,
  onSearchChange,
  cuisine,
  onCuisineChange,
}: ClientTopBarProps) {
  const user = useAuthStore((state) => state.user);
  const initials = user?.nom
    .split(" ")
    .map((name) => name[0])
    .join("");

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-20 p-3 sm:p-4">
      <div className="pointer-events-auto mx-auto max-w-2xl space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Restaurant ou plat"
              aria-label="Rechercher un restaurant ou un plat"
              className="h-11 rounded-xl border-white/80 bg-background/95 pr-3 pl-9 text-sm shadow-lg backdrop-blur-md"
            />
          </div>

          <Button
            type="button"
            variant="secondary"
            size="icon-lg"
            onClick={onDemanderGeolocation}
            className="rounded-xl bg-background/95 shadow-lg backdrop-blur-md hover:bg-background"
            aria-label="Me localiser"
          >
            <LocateFixed className={geoStatus === "demande" ? "animate-pulse text-primary" : "text-primary"} />
          </Button>

          <Button
            asChild
            variant="secondary"
            size="icon-lg"
            className="rounded-xl bg-background/95 shadow-lg backdrop-blur-md hover:bg-background"
          >
            <Link href={user ? "/profil" : "/client/login?redirect=%2Fprofil"} aria-label={user ? "Ouvrir mon profil" : "Se connecter"}>
              {user ? (
                <Avatar className="size-7">
                  <AvatarFallback className="bg-primary text-[10px] font-bold text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <UserRound className="text-foreground" />
              )}
            </Link>
          </Button>
        </div>

        {!isLoading && (
          <Badge variant="secondary" className="h-6 rounded-lg bg-background/90 px-2.5 shadow-sm backdrop-blur-md">
            <MapPin className="size-3 text-primary" />
            {nombreResultats} restaurant{nombreResultats !== 1 ? "s" : ""} à proximité
          </Badge>
        )}

        <nav aria-label="Filtrer par cuisine" className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {cuisines.map((label) => {
            const value = label === "Tout" ? null : label;
            const isActive = cuisine === value;

            return (
              <Button
                key={label}
                type="button"
                variant={isActive ? "default" : "secondary"}
                size="sm"
                onClick={() => onCuisineChange(value)}
                className="shrink-0 rounded-full px-3 shadow-sm backdrop-blur-md"
              >
                {label}
              </Button>
            );
          })}
        </nav>

        {geoStatus === "refusee" && (
          <p className="w-fit rounded-lg border border-amber-200 bg-amber-50/95 px-2.5 py-1.5 text-xs text-amber-800 shadow-sm backdrop-blur-md">
            Localisation refusée — affichage centré sur Abidjan.
          </p>
        )}
      </div>
    </header>
  );
}
