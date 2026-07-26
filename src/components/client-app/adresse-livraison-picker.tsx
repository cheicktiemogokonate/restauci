"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clientApi } from "@/lib/client-app/api-client";
import { CheckCircle2, MapPin, Search } from "lucide-react";
import { useState, useTransition } from "react";

interface Adresse {
  adresse: string;
  lat: number;
  lng: number;
}

interface AdresseLivraisonPickerProps {
  value: Adresse | null;
  onChange: (adresse: Adresse | null) => void;
}

export function AdresseLivraisonPicker({ value, onChange }: AdresseLivraisonPickerProps) {
  const [saisie, setSaisie] = useState(value?.adresse ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleGeocoder = () => {
    if (saisie.trim().length < 3) {
      setError("Saisissez au moins 3 caractères pour rechercher une adresse.");
      return;
    }
    setError(null);

    startTransition(async () => {
      const result = await clientApi.get<Adresse>(`/geo/geocode?q=${encodeURIComponent(saisie)}`);
      if (result.success && result.data) {
        onChange(result.data);
        setSaisie(result.data.adresse);
      } else {
        setError(result.error ?? "Adresse introuvable");
        onChange(null);
      }
    });
  };

  return (
    <section aria-labelledby="delivery-address-label" className="border-b py-5">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <MapPin className="size-4" />
          </span>
          <div>
            <Label id="delivery-address-label" htmlFor="delivery-address">Adresse de livraison</Label>
            <p className="mt-0.5 text-xs text-muted-foreground">Elle permet de calculer votre livraison.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Input
            id="delivery-address"
            value={saisie}
            onChange={(event) => setSaisie(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && handleGeocoder()}
            placeholder="Ex. Cocody Riviera 3, Abidjan"
            className="h-10"
          />
          <Button type="button" onClick={handleGeocoder} disabled={isPending} className="h-10 shrink-0">
            <Search />
            <span className="hidden sm:inline">Rechercher</span>
          </Button>
        </div>
        {value ? (
          <Alert className="mt-3 border-primary/15 bg-primary/5 text-primary">
            <CheckCircle2 />
            <AlertDescription className="text-primary/85">Adresse confirmée : {value.adresse}</AlertDescription>
          </Alert>
        ) : null}
        {error ? (
          <Alert variant="destructive" className="mt-3">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
    </section>
  );
}
