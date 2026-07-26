import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Map, MapControls, MapMarker, MarkerContent } from "@/components/ui/map";
import type { Restaurant } from "@/types";
import { ArrowUpRight, AtSign, Mail, MapPin, MessageCircle, Phone } from "lucide-react";

function externalUrl(value: string | null) {
  if (!value) return null;
  const candidate = value.startsWith("http://") || value.startsWith("https://") ? value : `https://${value}`;
  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export default function Footer({ restaurant }: { restaurant: Restaurant }) {
  const mapsUrl = `https://maps.google.com/?q=${restaurant.latitude},${restaurant.longitude}`;
  const whatsappUrl = restaurant.whatsapp ? `https://wa.me/${restaurant.whatsapp.replace(/\D/g, "")}` : null;
  const instagramUrl = externalUrl(restaurant.instagram);
  const facebookUrl = externalUrl(restaurant.facebook);

  return (
    <footer id="contact" className="border-t bg-background py-14 sm:py-18">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
          <section aria-labelledby="location-heading">
            <p className="text-xs font-bold tracking-[0.14em] text-primary uppercase">Nous trouver</p>
            <h2 id="location-heading" className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Venir chez {restaurant.nom}</h2>
            <div className="relative mt-5 aspect-[4/3] overflow-hidden rounded-2xl border bg-muted sm:aspect-video">
              <Map viewport={{ center: [restaurant.longitude, restaurant.latitude], zoom: 14 }} className="size-full">
                <MapMarker longitude={restaurant.longitude} latitude={restaurant.latitude}>
                  <MarkerContent>
                    <span className="flex size-10 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-lg"><MapPin className="size-4" /></span>
                  </MarkerContent>
                </MapMarker>
                <MapControls position="bottom-right" />
              </Map>
              <div className="pointer-events-none absolute top-3 left-3 z-10 max-w-[calc(100%-1.5rem)] rounded-lg bg-background/95 px-3 py-2 text-xs font-medium shadow-sm backdrop-blur-md"><span className="block truncate">{restaurant.adresse}</span></div>
              <Button asChild size="sm" className="absolute bottom-3 left-3 z-10 shadow-md"><a href={mapsUrl} target="_blank" rel="noreferrer">Itinéraire <ArrowUpRight /></a></Button>
            </div>
          </section>

          <section className="pt-1" aria-labelledby="contact-heading">
            <p className="text-xs font-bold tracking-[0.14em] text-primary uppercase">Contact</p>
            <h2 id="contact-heading" className="mt-2 text-2xl font-bold tracking-tight">Une question ?</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">Contactez directement le restaurant ou préparez votre itinéraire.</p>
            <div className="mt-6 space-y-3">
              <Button asChild variant="outline" className="h-auto w-full justify-start px-3 py-3 text-left"><a href={`tel:${restaurant.telephone.replace(/\s/g, "")}`}><Phone className="text-primary" /><span><span className="block text-xs text-muted-foreground">Téléphone</span><span>{restaurant.telephone}</span></span></a></Button>
              {restaurant.email ? <Button asChild variant="outline" className="h-auto w-full justify-start px-3 py-3 text-left"><a href={`mailto:${restaurant.email}`}><Mail className="text-primary" /><span><span className="block text-xs text-muted-foreground">E-mail</span><span className="break-all">{restaurant.email}</span></span></a></Button> : null}
            </div>
            {whatsappUrl || instagramUrl || facebookUrl ? <><Separator className="my-6" /><p className="text-sm font-semibold">Suivre le restaurant</p><div className="mt-3 flex flex-wrap gap-2">{whatsappUrl ? <Button asChild variant="outline" size="sm"><a href={whatsappUrl} target="_blank" rel="noreferrer"><MessageCircle /> WhatsApp</a></Button> : null}{instagramUrl ? <Button asChild variant="outline" size="sm"><a href={instagramUrl} target="_blank" rel="noreferrer"><AtSign /> Instagram</a></Button> : null}{facebookUrl ? <Button asChild variant="outline" size="sm"><a href={facebookUrl} target="_blank" rel="noreferrer"><AtSign /> Facebook</a></Button> : null}</div></> : null}
          </section>
        </div>
        <div className="mt-12 flex flex-col gap-2 border-t pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><p>© 2026 {restaurant.nom}</p><p>Page restaurant propulsée par Toutci</p></div>
      </div>
    </footer>
  );
}
