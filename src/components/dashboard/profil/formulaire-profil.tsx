"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateRestaurantAction } from "@/lib/actions/restaurant";
import type { Restaurant } from "@/types";
import { Loader2, Upload, X } from "lucide-react";
import { useState, useTransition } from "react";

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
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
      <h2 className="text-xl font-semibold mb-4">Profil du Restaurant</h2>
      <p className="text-gray-500 mb-6">
        Gérez les informations de base et les réglages spécifiques de{" "}
        {restaurant.nom}
      </p>

      <form action={handleSubmit} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Nom</label>
            <Input name="nom" defaultValue={restaurant.nom} required />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Téléphone</label>
            <Input
              name="telephone"
              defaultValue={restaurant.telephone}
              required
            />
          </div>
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium">Adresse</label>
          <Input name="adresse" defaultValue={restaurant.adresse} required />
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium">Description</label>
          <textarea
            name="description"
            defaultValue={restaurant.description ?? ""}
            className="w-full rounded-md border border-gray-200 p-2 text-sm"
            rows={3}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <label className="text-sm font-medium">
              Frais de livraison (FCFA)
            </label>
            <Input
              type="number"
              name="fraisLivraison"
              inputMode="numeric"
              min="0"
              defaultValue={restaurant.fraisLivraison ?? 0}
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">
              Commande minimum (FCFA)
            </label>
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
            <label className="text-sm font-medium">
              Temps de préparation moyen (min)
            </label>
            <Input
              type="number"
              name="tempsPreparationMoyen"
              inputMode="numeric"
              min="0"
              defaultValue={restaurant.tempsPreparationMoyen ?? 20}
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Modes de commande</label>
            <div className="flex flex-wrap gap-3 rounded-md border border-gray-200 p-3">
              {modesCommandeOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    name="modesCommande"
                    value={option.value}
                    defaultChecked={restaurant.modesCommande?.includes(
                      option.value,
                    )}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Email</label>
            <Input name="email" defaultValue={restaurant.email ?? ""} />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Site web</label>
            <Input name="siteWeb" defaultValue={restaurant.siteWeb ?? ""} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Ville</label>
            <Input name="ville" defaultValue={restaurant.ville ?? ""} />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Pays</label>
            <Input name="pays" defaultValue={restaurant.pays ?? ""} />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Latitude, Longitude</label>
            <div className="flex gap-2">
              <Input
                type="number"
                step="any"
                name="latitude"
                defaultValue={restaurant.latitude ?? ""}
                placeholder="lat"
              />
              <Input
                type="number"
                step="any"
                name="longitude"
                defaultValue={restaurant.longitude ?? ""}
                placeholder="lng"
              />
            </div>
          </div>
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium">
            Cuisines (séparées par des virgules)
          </label>
          <Input
            name="cuisines"
            defaultValue={(restaurant.cuisines || []).join(", ")}
            placeholder="Ex: Ivoirienne, Fast-food, Pizzeria"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Facebook</label>
            <Input name="facebook" defaultValue={restaurant.facebook ?? ""} />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Instagram</label>
            <Input name="instagram" defaultValue={restaurant.instagram ?? ""} />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">WhatsApp</label>
            <Input name="whatsapp" defaultValue={restaurant.whatsapp ?? ""} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
            <span className="text-sm font-medium">Accepter les commandes</span>
            <input
              type="checkbox"
              name="accepteCommandes"
              defaultChecked={restaurant.accepteCommandes ?? true}
              className="h-4 w-4 rounded border-gray-300"
            />
          </label>

          <label className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
            <span className="text-sm font-medium">Restaurant en ligne</span>
            <input
              type="checkbox"
              name="enLigne"
              defaultChecked={restaurant.enLigne ?? false}
              className="h-4 w-4 rounded border-gray-300"
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Logo du restaurant</p>
                <p className="text-xs text-gray-500">
                  Affiché dans les cartes et l’en-tête
                </p>
              </div>
              {logoUrl ? (
                <button
                  type="button"
                  onClick={() => setLogoUrl(null)}
                  className="rounded-full border border-gray-200 p-1 text-gray-500 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo du restaurant"
                className="mb-3 h-24 w-24 rounded-lg object-cover border"
              />
            ) : (
              <div className="mb-3 flex h-24 w-24 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500">
                Aucun logo
              </div>
            )}

            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
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
            </label>
          </div>

          <div className="rounded-lg border border-gray-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Bannière du restaurant</p>
                <p className="text-xs text-gray-500">
                  Visible sur la page publique du restaurant
                </p>
              </div>
              {bannerUrl ? (
                <button
                  type="button"
                  onClick={() => setBannerUrl(null)}
                  className="rounded-full border border-gray-200 p-1 text-gray-500 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            {bannerUrl ? (
              <img
                src={bannerUrl}
                alt="Bannière du restaurant"
                className="mb-3 h-24 w-full rounded-lg object-cover border"
              />
            ) : (
              <div className="mb-3 flex h-24 w-full items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500">
                Aucune bannière
              </div>
            )}

            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
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
            </label>
          </div>
        </div>

        {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-600">{success}</p>}

        <Button
          type="submit"
          disabled={isPending}
          className="bg-[#2d7d46] hover:bg-[#2d7d46]/90 text-white"
        >
          {isPending ? "Sauvegarde..." : "Sauvegarder"}
        </Button>
      </form>
    </div>
  );
}
