import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Restaurant } from "@/types";
import { MapPin } from "lucide-react";
import Image from "next/image";

export default function AboutUs({ restaurant }: { restaurant: Restaurant }) {
  const hasBanner = Boolean(restaurant.banniereUrl);
  const initials = restaurant.nom.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase();

  return (
    <section className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1fr_0.85fr] lg:items-center lg:px-8">
      <div>
        <p className="text-xs font-bold tracking-[0.14em] text-primary uppercase">Le restaurant</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{restaurant.nom}</h2>
        <p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
          {restaurant.description || `Découvrez la carte et les services proposés par ${restaurant.nom}.`}
        </p>
        {restaurant.cuisines?.length ? (
          <div className="mt-6 flex flex-wrap gap-2">
            {restaurant.cuisines.map((cuisine) => <Badge key={cuisine} variant="secondary">{cuisine}</Badge>)}
          </div>
        ) : null}
        <Separator className="my-7 max-w-xl" />
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="size-4 text-primary" />{[restaurant.ville, restaurant.pays].filter(Boolean).join(", ") || restaurant.adresse}</p>
      </div>

      {hasBanner ? (
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted sm:aspect-video lg:aspect-[4/3]">
          <Image src={restaurant.banniereUrl!} alt={`Devanture de ${restaurant.nom}`} fill sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
          {restaurant.logoUrl ? <Avatar className="absolute right-4 bottom-4 size-16 border-2 border-background bg-background shadow-lg"><AvatarImage src={restaurant.logoUrl} alt={`Logo ${restaurant.nom}`} /><AvatarFallback className="bg-primary text-primary-foreground">{initials}</AvatarFallback></Avatar> : null}
        </div>
      ) : (
        <div className="flex min-h-56 flex-col justify-end rounded-2xl bg-primary p-6 text-primary-foreground sm:min-h-64">
          <Avatar className="size-16 border border-primary-foreground/20"><AvatarImage src={restaurant.logoUrl ?? undefined} alt={`Logo ${restaurant.nom}`} /><AvatarFallback className="bg-primary-foreground/15 text-lg text-primary-foreground">{initials}</AvatarFallback></Avatar>
          <p className="mt-6 text-lg font-semibold">{restaurant.nom}</p>
          <p className="mt-1 text-sm text-primary-foreground/75">Informations et menu mis à jour par le restaurant.</p>
        </div>
      )}
    </section>
  );
}
