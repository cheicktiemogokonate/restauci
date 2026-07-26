import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { CreneauHoraire } from "@/lib/db/types";
import type { Restaurant } from "@/types";
import { Clock3, Mail, MapPin, Phone, ShoppingBag } from "lucide-react";

const modeLabels: Record<string, string> = {
  sur_place: "Sur place",
  emporter: "À emporter",
  livraison: "Livraison",
};

export default function PracticalDetails({ restaurant, creneauxList }: { restaurant: Restaurant; creneauxList: CreneauHoraire[] }) {
  const activeHours = creneauxList.filter((creneau) => creneau.actif);

  return (
    <section id="infos" className="border-y bg-muted/25 py-14 sm:py-18">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-xs font-bold tracking-[0.14em] text-primary uppercase">Informations utiles</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Préparez votre visite</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="flex gap-3"><Clock3 className="mt-0.5 size-5 shrink-0 text-primary" /><div><h3 className="font-semibold">Horaires</h3>{activeHours.length ? <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">{activeHours.map((hour) => <li key={hour.id}>{hour.nom} · {hour.heureOuverture.slice(0, 5)}–{hour.heureFermeture.slice(0, 5)}</li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">Contactez le restaurant pour les horaires.</p>}</div></div>
              <div className="flex gap-3"><ShoppingBag className="mt-0.5 size-5 shrink-0 text-primary" /><div><h3 className="font-semibold">Services</h3><div className="mt-2 flex flex-wrap gap-2">{restaurant.modesCommande.map((mode) => <Badge key={mode} variant="secondary">{modeLabels[mode] ?? mode}</Badge>)}</div></div></div>
            </div>
          </div>
          <div className="border-t pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10">
            <h3 className="text-base font-semibold">Contact</h3>
            <div className="mt-4 space-y-4 text-sm">
              <div className="flex items-start gap-3"><MapPin className="mt-0.5 size-4 shrink-0 text-primary" /><span className="text-muted-foreground">{restaurant.adresse}</span></div>
              <Separator />
              <Button asChild variant="link" className="h-auto justify-start p-0 text-foreground"><a href={`tel:${restaurant.telephone.replace(/\s/g, "")}`}><Phone />{restaurant.telephone}</a></Button>
              {restaurant.email ? <Button asChild variant="link" className="h-auto justify-start p-0 text-foreground"><a href={`mailto:${restaurant.email}`}><Mail />{restaurant.email}</a></Button> : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
