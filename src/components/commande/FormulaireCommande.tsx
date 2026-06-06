"use client";

import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useGeolocation } from "@/hooks/useGeolocation";
import type { CommandeItem } from "@/types";
import { haversineDistance } from "@/lib/utils/geo";

type ModeCommande = "sur_place" | "livraison" | "emporter";

interface FormulaireCommandeProps {
  restaurantId: string;
  restaurantLatitude: number;
  restaurantLongitude: number;
  items: CommandeItem[];
  sousTotal: number;
  onSuccess: () => void;
}

export default function FormulaireCommande({
  restaurantId,
  restaurantLatitude,
  restaurantLongitude,
  items,
  sousTotal,
  onSuccess,
}: FormulaireCommandeProps) {
  const [nomClient, setNomClient] = useState("");
  const [telephoneClient, setTelephoneClient] = useState("");
  const [numeroTable, setNumeroTable] = useState("");
  const [adresseLivraison, setAdresseLivraison] = useState("");
  const [modeCommande, setModeCommande] = useState<ModeCommande>("sur_place");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { coords, loading: geoLoading, error: geoError, demander } = useGeolocation();

  const livraisonInfo = useMemo(() => {
    if (!coords) {
      return null;
    }

    const result = haversineDistance(
      { latitude: coords.latitude, longitude: coords.longitude },
      { latitude: restaurantLatitude, longitude: restaurantLongitude }
    );

    const fraisLivraison = Math.max(500, Math.round(result.distanceKm * 200));
    return { ...result, fraisLivraison };
  }, [coords, restaurantLatitude, restaurantLongitude]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (items.length === 0) {
      setError("Le panier est vide. Ajoutez des plats avant de commander.");
      return;
    }

    if (!nomClient.trim()) {
      setError("Le nom du client est requis.");
      return;
    }

    if (modeCommande === "sur_place" && !numeroTable.trim()) {
      setError("Le numéro de table est requis pour une commande sur place.");
      return;
    }

    if (modeCommande === "livraison") {
      if (!telephoneClient.trim()) {
        setError("Le téléphone est requis pour la livraison.");
        return;
      }
      if (!coords && !adresseLivraison.trim()) {
        setError(
          "La géolocalisation est refusée ou indisponible, veuillez renseigner une adresse de livraison."
        );
        return;
      }
    }

    setLoading(true);

    try {
      const response = await fetch("/api/commandes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          restaurantId,
          modeCommande,
          nomClient,
          telephoneClient: telephoneClient.trim() || null,
          numeroTable: modeCommande === "sur_place" ? numeroTable.trim() : null,
          adresseLivraison: adresseLivraison.trim() || null,
          latitudeLivraison: coords?.latitude ?? null,
          longitudeLivraison: coords?.longitude ?? null,
          items,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Une erreur est survenue lors de l'envoi de la commande.");
        return;
      }

      toast.success(`Commande ${data.numero} enregistrée avec succès !`);
      onSuccess();
      setNomClient("");
      setTelephoneClient("");
      setNumeroTable("");
      setAdresseLivraison("");
    } catch (err) {
      setError("Impossible d'envoyer la commande. Réessayez plus tard.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form id="formulaire-commande" onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="nomClient">Nom du client</Label>
          <Input
            id="nomClient"
            value={nomClient}
            onChange={(event) => setNomClient(event.target.value)}
            placeholder="Marie Dubois"
            disabled={loading}
            className="min-h-12"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="modeCommande">Mode de commande</Label>
          <Select
            value={modeCommande}
            onValueChange={(value) => setModeCommande(value as ModeCommande)}
          >
            <SelectTrigger id="modeCommande" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sur_place">Sur place</SelectItem>
              <SelectItem value="livraison">Livraison</SelectItem>
              <SelectItem value="emporter">À emporter</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {modeCommande === "sur_place" && (
        <div className="space-y-2">
          <Label htmlFor="numeroTable">Numéro de table</Label>
          <Input
            id="numeroTable"
            value={numeroTable}
            onChange={(event) => setNumeroTable(event.target.value)}
            placeholder="Ex. 12"
            disabled={loading}
            className="min-h-12"
          />
        </div>
      )}

      {modeCommande !== "sur_place" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="telephoneClient">Téléphone</Label>
            <Input
              id="telephoneClient"
              type="tel"
              value={telephoneClient}
              onChange={(event) => setTelephoneClient(event.target.value)}
              placeholder="0X XX XX XX XX"
              disabled={loading}
              className="min-h-12"
            />
          </div>

          {modeCommande === "livraison" && (
            <div className="space-y-2">
              <Label>Géolocalisation</Label>
              <div className="flex items-center gap-3">
                <Button type="button" onClick={demander} disabled={geoLoading || loading}>
                  Obtenir ma position
                </Button>
                {geoLoading && <Skeleton className="h-10 w-24 rounded-md" />}
              </div>
              {geoError && (
                <Alert variant="destructive">
                  <AlertDescription>{geoError}</AlertDescription>
                </Alert>
              )}
              {coords && livraisonInfo && (
                <div className="space-y-2 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <p>Distance estimée : {livraisonInfo.distanceLabel}</p>
                  <p>Frais livraison : {livraisonInfo.fraisLivraison.toLocaleString("fr-FR")} FCFA</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {modeCommande === "livraison" && (
        <div className="space-y-2">
          <Label htmlFor="adresseLivraison">Adresse de livraison</Label>
          <Input
            id="adresseLivraison"
            value={adresseLivraison}
            onChange={(event) => setAdresseLivraison(event.target.value)}
            placeholder="Ex. 12 rue de la Paix, Dakar"
            disabled={loading}
            className="min-h-12"
          />
          <p className="text-sm text-slate-500">
            {coords ? "Adresse de livraison en secours si nécessaire." : "Requis si la géolocalisation est refusée."}
          </p>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {/* confirmations affichées via Sonner */}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <p className="text-sm text-slate-500">Sous-total</p>
          <p className="mt-2 text-xl font-semibold text-slate-900">{sousTotal.toLocaleString("fr-FR")} FCFA</p>
        </div>
        <Button type="submit" className="w-full" disabled={loading || items.length === 0}>
          {loading ? "Envoi en cours..." : "Commander"}
        </Button>
      </div>
    </form>
  );
}
