"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { RestaurantDetail } from "@/lib/client-app/hooks/use-restaurant-detail";
import type { RestaurantProche } from "@/lib/client-app/hooks/use-restaurants-proches";
import { Clock3, MapPinned, Navigation, Route } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Drawer } from "vaul";

interface RestaurantBottomSheetProps {
  isOpen: boolean;
  slug: string | null;
  restaurant: RestaurantDetail | null;
  previewRestaurant?: RestaurantProche | null;
  isLoading: boolean;
  showRoute?: boolean;
  onToggleRoute: () => void;
  onClose: () => void;
}

export function RestaurantBottomSheet({
  isOpen,
  slug,
  restaurant,
  previewRestaurant,
  isLoading,
  showRoute,
  onToggleRoute,
  onClose,
}: RestaurantBottomSheetProps) {
  const nom = restaurant?.nom ?? previewRestaurant?.nom;
  const logoUrl = restaurant?.logoUrl ?? previewRestaurant?.logoUrl;
  const cuisines = restaurant?.cuisines ?? previewRestaurant?.cuisines;
  const distance = restaurant?.geo?.distanceKm ?? previewRestaurant?.distanceKm;
  const itineraire = restaurant?.geo?.itineraire;
  const accepteCommandes = restaurant?.accepteCommandes ?? previewRestaurant?.accepteCommandes;

  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-30 bg-black/30" />
        <Drawer.Content className="fixed right-0 bottom-0 left-0 z-40 mx-auto flex max-w-2xl flex-col rounded-t-3xl bg-background shadow-2xl outline-none">
          <Drawer.Title className="sr-only">{nom ? `${nom} — aperçu` : "Aperçu du restaurant"}</Drawer.Title>
          <div className="flex justify-center pt-3 pb-2"><div className="h-1.5 w-10 rounded-full bg-muted-foreground/25" /></div>
          {!restaurant && !previewRestaurant && isLoading ? (
            <div className="space-y-4 px-5 pt-3 pb-7"><Skeleton className="h-16 w-full rounded-2xl" /><Skeleton className="h-10 w-full rounded-xl" /><Skeleton className="h-10 w-full rounded-xl" /></div>
          ) : (
            <div className="px-4 pt-2 pb-5 sm:px-5">
              <div className="flex items-start gap-3">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-2xl bg-muted ring-1 ring-border">
                  {logoUrl ? <Image src={logoUrl} alt={nom ?? "Restaurant"} fill sizes="64px" className="object-cover" /> : <span className="flex size-full items-center justify-center text-xl font-semibold text-muted-foreground">{nom?.charAt(0).toUpperCase()}</span>}
                </div>
                <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><h2 className="text-lg leading-tight font-bold">{nom}</h2>{accepteCommandes ? <Badge className="shrink-0 bg-primary/10 text-primary hover:bg-primary/10">Ouvert</Badge> : <Badge variant="destructive" className="shrink-0">Indisponible</Badge>}</div>{cuisines?.length ? <p className="mt-1 truncate text-sm text-muted-foreground">{cuisines.join(" · ")}</p> : null}<div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">{restaurant?.noteMoyenne ? <span className="font-semibold text-foreground">⭐ {restaurant.noteMoyenne}</span> : null}{distance !== undefined ? <span className="flex items-center gap-1"><MapPinned className="size-3.5 text-primary" />{distance} km</span> : null}{restaurant?.tempsAttente?.label ? <span className="flex items-center gap-1"><Clock3 className="size-3.5 text-primary" />{restaurant.tempsAttente.label}</span> : null}</div></div>
              </div>

              {restaurant?.adresse ? <div className="mt-4 flex gap-2 border-t pt-4 text-sm text-muted-foreground"><MapPinned className="mt-0.5 size-4 shrink-0 text-primary" /><span>{restaurant.adresse}</span></div> : null}

              {itineraire ? <div className="mt-4 flex items-center justify-between gap-3 border-t pt-4"><div className="min-w-0"><p className="flex items-center gap-1.5 text-sm font-semibold"><Navigation className="size-4 text-primary" />Itinéraire</p><p className="mt-0.5 text-xs text-muted-foreground">{itineraire.distanceKm} km · environ {itineraire.dureeMinutes} min</p></div><Button type="button" variant={showRoute ? "secondary" : "outline"} size="sm" onClick={onToggleRoute} className="shrink-0"><Route />{showRoute ? "Masquer" : "Voir"}</Button></div> : null}

              {!accepteCommandes ? <p className="mt-4 text-sm text-destructive">Ce restaurant ne reçoit pas de commandes pour le moment.</p> : null}
              <Button asChild size="lg" className="mt-5 h-11 w-full rounded-xl"><Link href={`/client/restaurant/${restaurant?.slug ?? previewRestaurant?.slug ?? slug ?? ""}`}>Voir le restaurant et le menu</Link></Button>
            </div>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
