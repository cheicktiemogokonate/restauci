"use client";

import { Search } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { geocodeResidenceAddressAction } from "@/app/(dashboard)/partenaire/residences/actions";
import InteractiveMap from "@/components/onboarding/InteractiveMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Coordinates = { latitude: number; longitude: number } | null;

interface ResidenceLocationPickerProps {
  address: string;
  city: string;
  country: string;
  coordinates: Coordinates;
  disabled?: boolean;
  onAddressChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onCountryChange: (value: string) => void;
  onCoordinatesChange: (value: Coordinates) => void;
}

export function ResidenceLocationPicker({
  address,
  city,
  country,
  coordinates,
  disabled = false,
  onAddressChange,
  onCityChange,
  onCountryChange,
  onCoordinatesChange,
}: ResidenceLocationPickerProps) {
  const [isSearching, startSearchTransition] = useTransition();

  const searchAddress = () => {
    startSearchTransition(async () => {
      const result = await geocodeResidenceAddressAction({ address, city, country });
      if (result.error || !result.result) {
        toast.error(result.error ?? "Impossible de trouver cette adresse.");
        return;
      }

      onCoordinatesChange({
        latitude: result.result.lat,
        longitude: result.result.lng,
      });
      if (result.result.ville) onCityChange(result.result.ville);
      if (result.result.pays) onCountryChange(result.result.pays);
      toast.success("Position trouvée. Ajustez le marqueur si nécessaire.");
    });
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="residence-address">Adresse ou point de repère</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="residence-address"
              value={address}
              onChange={(event) => onAddressChange(event.target.value)}
              placeholder="Ex. Assinie Mafia, près du débarcadère"
              maxLength={500}
              disabled={disabled}
            />
            <Button
              type="button"
              onClick={searchAddress}
              disabled={disabled || isSearching || address.trim().length < 3}
              className="shrink-0"
            >
              <Search className="size-4" />
              {isSearching ? "Recherche…" : "Trouver sur la carte"}
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="residence-city">Ville ou localité</Label>
          <Input
            id="residence-city"
            value={city}
            onChange={(event) => onCityChange(event.target.value)}
            placeholder="Ex. Assinie"
            maxLength={100}
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="residence-country">Pays</Label>
          <Input
            id="residence-country"
            value={country}
            onChange={(event) => onCountryChange(event.target.value)}
            maxLength={100}
            disabled={disabled}
          />
        </div>
      </div>

      <InteractiveMap
        latitude={coordinates?.latitude ?? null}
        longitude={coordinates?.longitude ?? null}
        commune={city}
        disabled={disabled}
        onCoordinatesChange={(latitude, longitude) =>
          onCoordinatesChange({ latitude, longitude })
        }
      />
      <p className="text-xs leading-5 text-muted-foreground">
        La position sert à aider les voyageurs à trouver le logement. Elle ne vous
        impose pas les zones de livraison utilisées pour les restaurants.
      </p>
    </div>
  );
}
