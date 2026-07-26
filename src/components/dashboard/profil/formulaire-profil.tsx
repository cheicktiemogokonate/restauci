"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { RestaurantLocationPicker } from "@/components/dashboard/profil/restaurant-location-picker";
import {
  setRestaurantOnlineAction,
  setRestaurantOrderAcceptanceAction,
  updateRestaurantAction,
} from "@/lib/actions/restaurant";
import type { Restaurant } from "@/types";
import { CirclePause, Loader2, Power, Upload, X } from "lucide-react";
import Image from "next/image";
import { useState, useTransition } from "react";
import { toast } from "sonner";

const modesCommandeOptions = [
  { value: "sur_place", label: "Sur place" },
  { value: "livraison", label: "Livraison" },
  { value: "emporter", label: "À emporter" },
] as const;

export default function FormulaireProfil({
  restaurant,
}: {
  restaurant: Restaurant;
}) {
  const [isPending, startTransition] = useTransition();
  const [isServicePending, startServiceTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(
    restaurant.logoUrl ?? null,
  );
  const [bannerUrl, setBannerUrl] = useState<string | null>(
    restaurant.banniereUrl ?? null,
  );
  const [enLigne, setEnLigne] = useState(restaurant.enLigne ?? false);
  const [accepteCommandes, setAccepteCommandes] = useState(
    restaurant.accepteCommandes ?? true,
  );
  const [modesCommande, setModesCommande] = useState<string[]>(
    restaurant.modesCommande ?? ["sur_place"],
  );
  const [adresse, setAdresse] = useState(restaurant.adresse ?? "");
  const [ville, setVille] = useState(restaurant.ville ?? "");
  const [pays, setPays] = useState(restaurant.pays ?? "");
  const [coordinates, setCoordinates] = useState<{
    lat: number;
    lng: number;
  } | null>(() =>
    typeof restaurant.latitude === "number" &&
    typeof restaurant.longitude === "number"
      ? { lat: restaurant.latitude, lng: restaurant.longitude }
      : null,
  );

  const handleOnlineChange = (nextEnLigne: boolean) => {
    const previousEnLigne = enLigne;
    const previousAccepteCommandes = accepteCommandes;

    startServiceTransition(async () => {
      setEnLigne(nextEnLigne);
      setAccepteCommandes(nextEnLigne);
      const result = await setRestaurantOnlineAction(nextEnLigne);

      if (result.error) {
        setEnLigne(previousEnLigne);
        setAccepteCommandes(previousAccepteCommandes);
        toast.error(result.error);
        return;
      }

      toast.success(
        nextEnLigne
          ? "Restaurant en ligne : les commandes sont ouvertes."
          : "Restaurant hors ligne : aucune commande ne peut passer.",
      );
    });
  };

  const handleOrderAcceptanceChange = (nextAccepteCommandes: boolean) => {
    const previousAccepteCommandes = accepteCommandes;

    startServiceTransition(async () => {
      setAccepteCommandes(nextAccepteCommandes);
      const result = await setRestaurantOrderAcceptanceAction(
        nextAccepteCommandes,
      );

      if (result.error) {
        setAccepteCommandes(previousAccepteCommandes);
        toast.error(result.error);
        return;
      }

      toast.success(
        nextAccepteCommandes
          ? "Les nouvelles commandes sont acceptées."
          : "Les nouvelles commandes sont suspendues.",
      );
    });
  };

  const handleModeCommandeChange = (mode: string, checked: boolean) => {
    setModesCommande((current) => {
      if (checked) return [...new Set([...current, mode])];
      return current.filter((item) => item !== mode);
    });
  };

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/media/upload", {
      method: "POST",
      body: formData,
    });
    const data = (await response.json()) as { url?: string; error?: string };

    if (!response.ok || !data.url) {
      throw new Error(data.error ?? "Erreur lors de l'envoi de l'image.");
    }

    return data.url;
  };

  const handleSubmit = (formData: FormData) => {
    if (logoUrl) formData.set("logoUrl", logoUrl);
    if (bannerUrl) formData.set("banniereUrl", bannerUrl);
    formData.set("adresse", adresse);
    formData.set("ville", ville);
    formData.set("pays", pays);
    if (coordinates) {
      formData.set("latitude", String(coordinates.lat));
      formData.set("longitude", String(coordinates.lng));
    } else {
      formData.delete("latitude");
      formData.delete("longitude");
    }

    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await updateRestaurantAction(null, formData);
      if (result?.error) {
        setError(
          typeof result.error === "string"
            ? result.error
            : "Impossible de mettre à jour le profil",
        );
        return;
      }

      setSuccess("Configuration enregistrée avec succès.");
    });
  };

  const handleImageUpload = async (
    type: "logo" | "banner",
    file: File | null,
  ) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("Le fichier doit être une image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("L'image doit faire moins de 5 Mo.");
      return;
    }

    if (type === "logo") {
      setUploadingLogo(true);
    } else {
      setUploadingBanner(true);
    }

    setUploadError(null);
    try {
      const url = await uploadFile(file);
      if (type === "logo") {
        setLogoUrl(url);
      } else {
        setBannerUrl(url);
      }
      setSuccess("Image téléchargée avec succès.");
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "Erreur lors de l'envoi de l'image.",
      );
    } finally {
      if (type === "logo") {
        setUploadingLogo(false);
      } else {
        setUploadingBanner(false);
      }
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
      <h2 className="mb-2 text-xl font-semibold text-foreground">Profil du restaurant</h2>
      <p className="mb-6 text-muted-foreground">
        Gérez les informations de base et les réglages spécifiques de{" "}
        {restaurant.nom}
      </p>

      <section className="mb-8 overflow-hidden rounded-2xl border border-brand-green/15 bg-brand-green/[0.035] p-4 sm:p-5">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-green/10 text-brand-green">
            {enLigne ? <Power className="h-4 w-4" /> : <CirclePause className="h-4 w-4" />}
          </div>
          <div>
            <h3 className="font-semibold text-foreground">État du service</h3>
            <p className="text-sm text-muted-foreground">
              {enLigne
                ? accepteCommandes
                  ? "Votre restaurant est visible et reçoit des commandes."
                  : "Votre restaurant est visible, mais les commandes sont suspendues."
                : "Votre restaurant est hors ligne et invisible aux clients."}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-background/80 p-3.5">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Restaurant en ligne</p>
              <p className="text-xs text-muted-foreground">Hors ligne, il est masqué et aucune commande ne passe.</p>
            </div>
            <Switch
              checked={enLigne}
              onCheckedChange={handleOnlineChange}
              disabled={isServicePending}
              aria-label="Mettre le restaurant en ligne"
              className="data-checked:bg-brand-green"
            />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-background/80 p-3.5">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Accepter les commandes</p>
              <p className="text-xs text-muted-foreground">Suspend les nouvelles commandes tout en restant visible.</p>
            </div>
            <Switch
              checked={accepteCommandes}
              onCheckedChange={handleOrderAcceptanceChange}
              disabled={isServicePending || !enLigne}
              aria-label="Accepter les nouvelles commandes"
              className="data-checked:bg-brand-green"
            />
          </div>
        </div>
      </section>

      <form action={handleSubmit} className="space-y-6">
        <section className="space-y-5 rounded-2xl border border-border/70 bg-background p-4 sm:p-5">
          <div>
            <h3 className="font-semibold text-foreground">Informations publiques</h3>
            <p className="text-sm text-muted-foreground">Ce que les clients voient pour identifier votre restaurant.</p>
          </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label>Nom</Label>
            <Input name="nom" defaultValue={restaurant.nom} required />
          </div>

          <div className="grid gap-2">
            <Label>Téléphone</Label>
            <Input
              name="telephone"
              defaultValue={restaurant.telephone}
              required
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label>Description</Label>
          <Textarea
            name="description"
            defaultValue={restaurant.description ?? ""}
            rows={3}
          />
        </div>
        </section>

        <section className="space-y-5 rounded-2xl border border-border/70 bg-background p-4 sm:p-5">
          <div>
            <h3 className="font-semibold text-foreground">Commandes et livraison</h3>
            <p className="text-sm text-muted-foreground">Les règles appliquées aux commandes reçues par votre restaurant.</p>
          </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label>
              Frais de livraison (FCFA)
            </Label>
            <Input
              type="number"
              name="fraisLivraison"
              inputMode="numeric"
              min="0"
              defaultValue={restaurant.fraisLivraison ?? 0}
            />
          </div>

          <div className="grid gap-2">
            <Label>
              Commande minimum (FCFA)
            </Label>
            <Input
              type="number"
              name="commandeMinimum"
              inputMode="numeric"
              min="0"
              defaultValue={restaurant.commandeMinimum ?? 0}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label>
              Temps de préparation moyen (min)
            </Label>
            <Input
              type="number"
              name="tempsPreparationMoyen"
              inputMode="numeric"
              min="0"
              defaultValue={restaurant.tempsPreparationMoyen ?? 20}
            />
          </div>

          <div className="grid gap-2">
            <Label>Modes de commande</Label>
            <div className="flex flex-wrap gap-x-5 gap-y-3 rounded-lg border border-input bg-muted/20 p-3">
              {modesCommandeOptions.map((option) => (
                <div
                  key={option.value}
                  className="flex items-center gap-2 text-sm"
                >
                  <Checkbox
                    id={`mode-${option.value}`}
                    checked={modesCommande.includes(option.value)}
                    onCheckedChange={(checked) =>
                      handleModeCommandeChange(option.value, checked === true)
                    }
                  />
                  <Label htmlFor={`mode-${option.value}`}>{option.label}</Label>
                </div>
              ))}
            </div>
            {modesCommande.map((mode) => (
              <input key={mode} type="hidden" name="modesCommande" value={mode} />
            ))}
          </div>
        </div>
        </section>

        <section className="space-y-5 rounded-2xl border border-border/70 bg-background p-4 sm:p-5">
          <div>
            <h3 className="font-semibold text-foreground">Contact et localisation</h3>
            <p className="text-sm text-muted-foreground">Les coordonnées utilisées par les clients et pour les livraisons.</p>
          </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label>Email</Label>
            <Input name="email" defaultValue={restaurant.email ?? ""} />
          </div>

          <div className="grid gap-2">
            <Label>Site web</Label>
            <Input name="siteWeb" defaultValue={restaurant.siteWeb ?? ""} />
          </div>
        </div>

        <RestaurantLocationPicker
          adresse={adresse}
          ville={ville}
          pays={pays}
          coordinates={coordinates}
          onAdresseChange={setAdresse}
          onVilleChange={setVille}
          onPaysChange={setPays}
          onCoordinatesChange={setCoordinates}
        />
        </section>

        <section className="space-y-5 rounded-2xl border border-border/70 bg-background p-4 sm:p-5">
          <div>
            <h3 className="font-semibold text-foreground">Identité de la carte</h3>
            <p className="text-sm text-muted-foreground">Les éléments qui accompagnent votre restaurant sur les écrans publics.</p>
          </div>
        <div className="grid gap-2">
          <Label>
            Cuisines (séparées par des virgules)
          </Label>
          <Input
            name="cuisines"
            defaultValue={(restaurant.cuisines || []).join(", ")}
            placeholder="Ex: Ivoirienne, Fast-food, Pizzeria"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="grid gap-2">
            <Label>Facebook</Label>
            <Input name="facebook" defaultValue={restaurant.facebook ?? ""} />
          </div>
          <div className="grid gap-2">
            <Label>Instagram</Label>
            <Input name="instagram" defaultValue={restaurant.instagram ?? ""} />
          </div>
          <div className="grid gap-2">
            <Label>WhatsApp</Label>
            <Input name="whatsapp" defaultValue={restaurant.whatsapp ?? ""} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Logo du restaurant</p>
                <p className="text-xs text-muted-foreground">
                  Affiché dans les cartes et l’en-tête
                </p>
              </div>
              {logoUrl ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setLogoUrl(null)}
                  className="rounded-full border border-border text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Retirer le logo</span>
                </Button>
              ) : null}
            </div>

            {logoUrl ? (
              <Image
                src={logoUrl}
                alt="Logo du restaurant"
                className="mb-3 h-24 w-24 rounded-xl border border-border object-cover"
                width={96}
                height={96}
              />
            ) : (
              <div className="mb-3 flex h-24 w-24 items-center justify-center rounded-xl border border-dashed border-border bg-background text-sm text-muted-foreground">
                Aucun logo
              </div>
            )}

            <Label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-input px-3 py-2 text-foreground hover:bg-muted/50">
              {uploadingLogo ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              <span>{uploadingLogo ? "Envoi..." : "Changer le logo"}</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) =>
                  handleImageUpload("logo", event.target.files?.[0] ?? null)
                }
              />
            </Label>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Bannière du restaurant</p>
                <p className="text-xs text-muted-foreground">
                  Visible sur la page publique du restaurant
                </p>
              </div>
              {bannerUrl ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setBannerUrl(null)}
                  className="rounded-full border border-border text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Retirer la bannière</span>
                </Button>
              ) : null}
            </div>

            {bannerUrl ? (
              <Image
                src={bannerUrl}
                alt="Bannière du restaurant"
                className="mb-3 h-24 w-full rounded-xl border border-border object-cover"
                width={800}
                height={96}
              />
            ) : (
              <div className="mb-3 flex h-24 w-full items-center justify-center rounded-xl border border-dashed border-border bg-background text-sm text-muted-foreground">
                Aucune bannière
              </div>
            )}

            <Label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-input px-3 py-2 text-foreground hover:bg-muted/50">
              {uploadingBanner ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              <span>
                {uploadingBanner ? "Envoi..." : "Changer la bannière"}
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) =>
                  handleImageUpload("banner", event.target.files?.[0] ?? null)
                }
              />
            </Label>
          </div>
        </div>
        </section>

        {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-600">{success}</p>}

        <Button
          type="submit"
          disabled={isPending}
          size="lg"
          className="w-full sm:w-auto"
        >
          {isPending ? "Sauvegarde..." : "Sauvegarder"}
        </Button>
      </form>
    </div>
  );
}
