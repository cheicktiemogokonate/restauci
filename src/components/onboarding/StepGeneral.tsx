import Image from "next/image";
import { Input } from "@/components/motion/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/motion/select";
import {
  BedDouble,
  CalendarDays,
  Check,
  ChevronRight,
  Image as ImageIcon,
  Trash2,
  Upload,
  Utensils,
} from "lucide-react";
import React, { useState } from "react";
import {
  ESTABLISHMENT_TYPE_OPTIONS,
  RESTAURANT_TYPE_OPTIONS,
  SERVICE_TYPE_OPTIONS,
} from "@/lib/onboarding/settings";
import type { GeneralInfo, RestaurantSettings } from "./types";
import { Button } from "../ui/button";
import { Input as FileInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface StepGeneralProps {
  data: GeneralInfo;
  updateData: (fields: Partial<GeneralInfo>) => void;
  settings: RestaurantSettings;
  updateSettings: (fields: Partial<RestaurantSettings>) => void;
  onNext: () => void;
}


export default function StepGeneral({
  data,
  updateData,
  settings,
  updateSettings,
  onNext,
}: StepGeneralProps) {
  const [logoPreview, setLogoPreview] = useState<string | null>(data.logoUrl);
  const [bannerPreview, setBannerPreview] = useState<string | null>(
    data.bannerUrl,
  );
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);



  const uploadImage = async (file: File) => {
    const formData = new FormData();
    formData.set("file", file);
    const response = await fetch("/api/media/upload", {
      method: "POST",
      body: formData,
    });
    const payload = (await response.json()) as { url?: string; error?: string };
    if (!response.ok || !payload.url) {
      throw new Error(payload.error || "Impossible d’envoyer cette image.");
    }
    return payload.url;
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setError(null);
    try {
      const url = await uploadImage(file);
      setLogoPreview(url);
      updateData({ logoUrl: url });
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Impossible d’envoyer le logo.",
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setError(null);
    try {
      const url = await uploadImage(file);
      setBannerPreview(url);
      updateData({ bannerUrl: url });
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Impossible d’envoyer la couverture.",
      );
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (type: "logo" | "banner") => {
    if (type === "logo") {
      setLogoPreview(null);
      updateData({ logoUrl: null });
    } else if (type === "banner") {
      setBannerPreview(null);
      updateData({ bannerUrl: null });
    }
  };

  const validateAndProceed = () => {
    if (!data.name.trim()) {
      setError("Le nom de votre restaurant est requis.");
      return;
    }
    if (!data.description.trim()) {
      setError("Une brève description est requise.");
      return;
    }
    if (!settings.category) {
      setError("Choisissez le type de restaurant.");
      return;
    }
    if (settings.serviceTypes.length === 0) {
      setError("Choisissez au moins un mode de service.");
      return;
    }
    setError(null);
    onNext();
  };

  const toggleServiceType = (
    type: (typeof SERVICE_TYPE_OPTIONS)[number]["id"],
  ) => {
    const serviceTypes = settings.serviceTypes.includes(type)
      ? settings.serviceTypes.filter((current) => current !== type)
      : [...settings.serviceTypes, type];
    updateSettings({ serviceTypes });
    setError(null);
  };

  return (
    <div className="flex-1 max-w-4xl p-6 lg:p-10 overflow-y-auto">
      {/* Step Header */}
      <div className="mb-8">
        <span className="text-xs font-mono text-gray-400 font-semibold uppercase tracking-wider">
          Étape 1/5
        </span>
        <h1 className="text-2xl font-bold font-display text-gray-900 tracking-tight leading-none">
          Enseigne & Identité visuelle
        </h1>
        <p className="text-sm text-gray-500 mt-2 font-sans">
          Présentez votre établissement et choisissez son activité principale.
        </p>
      </div>

      <div className="space-y-8 bg-white border border-gray-100 rounded-2xl p-6 lg:p-8 shadow-sm">
        {/* Error Messaging */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-medium font-sans">
            ⚠️ {error}
          </div>
        )}

        <section
          aria-labelledby="activity-heading"
          className="rounded-2xl p-2"
        >
          <div className="flex items-start justify-between gap-4">

            <h2
              id="activity-heading"
              className="text-sm font-bold text-gray-950"
            >
              Votre activité
            </h2>


          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {ESTABLISHMENT_TYPE_OPTIONS.map((option) => {
              const selected = settings.establishmentType === option.id;
              return (
                  <Button
                    key={option.id}
                    onClick={() =>
                      option.available &&
                      updateSettings({ establishmentType: option.id })
                    }
                    disabled={!option.available}
                    variant={selected ? "secondary" : "outline"}
                    aria-pressed={selected}
                    className={selected ? "text-green-800" : ""}
                  >
                    {selected ? (
                      <Check className="size-3.5" aria-hidden="true" />
                    ) : null}
                    {option.id === "restaurant" ? (
                      <Utensils className="size-3.5" aria-hidden="true" />
                    ) : option.id === "residence" ? (
                      <BedDouble className="size-3.5" aria-hidden="true" />
                    ) : (
                      <CalendarDays className="size-3.5" aria-hidden="true" />
                    )}

                    <span className="truncate">{option.name}</span>
                    {!option.available ? (
                      <span className="absolute -top-1.5 right-1 rounded-full bg-gray-900 px-1 text-[8px] font-bold text-gray-400">
                        Bientôt
                      </span>
                    ) : null}
                  </Button>
              );
            })}
          </div>

          {settings.establishmentType === "restaurant" ? (
            <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold tracking-wide text-gray-600 uppercase">
                  Type de restaurant
                </Label>
                <Select
                  value={settings.category}
                  onValueChange={(category) => {
                    updateSettings({ category });
                    setError(null);
                  }}
                >
                  <SelectTrigger className="h-10 bg-white">
                    <SelectValue placeholder="Choisir un type" />
                  </SelectTrigger>
                  <SelectContent>
                    {RESTAURANT_TYPE_OPTIONS.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <p className="text-[11px] font-bold tracking-wide text-gray-600 uppercase">
                  Services
                </p>
                <div className="flex flex-wrap gap-2">
                  {SERVICE_TYPE_OPTIONS.map((service) => {
                    const selected = settings.serviceTypes.includes(service.id);
                    return (
                      <Button
                        key={service.id}
                        variant={selected ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => toggleServiceType(service.id)}
                        className={selected ? "text-green-800" : ""}
                      >
                        {selected ? (
                          <Check className="size-3.5" aria-hidden="true" />
                        ) : null}
                        {service.name}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}
        </section>

        {/* Input Fields */}
        <div className="grid grid-cols-1 gap-6">
            <Input
              type="text"
              id="name"
              name="restaurant-name"
              label="Nom de l’établissement *"
              placeholder="Ex: Le Krystal, Maquis la Braise"
              value={data.name}
              onChange={(name) => updateData({ name })}
            />

          <div>
            <div className="flex justify-between items-center mb-2">
              <Label
                htmlFor="description"
                className="px-1 text-[11px] font-bold tracking-[0.08em] text-[#173c2f]/75 uppercase"
              >
                Slogan & Description *
              </Label>
              <span
                className="font-mono text-[10px] text-gray-400"
              >
                {data.description.length} / 300
              </span>
            </div>
            <Textarea
              id="description"
              name="description"
              rows={3}
              maxLength={300}
              placeholder="Décrivez en quelques mots l'histoire culinaire du restaurant..."
              value={data.description}
              onChange={(e) => {
                updateData({ description: e.target.value });
              }}
              className="min-h-24 resize-none rounded-2xl border-black/8 bg-[#f7faf8] px-4 py-3 text-sm font-medium text-[#132d24] placeholder:text-[#789087]/70 focus-visible:border-[#0f8a5f]/45 focus-visible:bg-white focus-visible:ring-[#0f8a5f]/10"
            />
          </div>
        </div>

        {/* Logo and Cover Side-by-Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Logo Dropzone */}
          <div>
            <p className="block text-sm font-semibold text-gray-900 mb-2">
              Logo de l&apos;enseigne <span className="font-normal text-gray-400">(optionnel)</span>
            </p>
            <div className="relative border-2 border-dashed border-gray-200 rounded-2xl p-4 flex flex-col items-center justify-center bg-gray-50/50 hover:bg-gray-50 transition-colors h-40 group">
              {logoPreview ? (
                <div className="absolute inset-2 bg-white rounded-xl overflow-hidden flex items-center justify-center p-3 group">
                  <Image
                    src={logoPreview}
                    alt="Logo restaurant"
                    referrerPolicy="no-referrer"
                    className="max-h-full max-w-full object-contain rounded-lg shadow-sm"
                    width={160}
                    height={160}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200 gap-2">
                    <button
                      type="button"
                      onClick={() => removeImage("logo")}
                      aria-label="Supprimer le logo"
                      className="p-1.5 bg-white/95 rounded-lg text-red-500 hover:bg-white transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <Label
                  htmlFor="onboarding-logo"
                  className="flex h-full w-full cursor-pointer flex-col items-center justify-center text-center"
                >
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-gray-400 group-hover:text-brand-500 group-hover:scale-105 transition-all">
                    <Upload className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 mt-2.5 block">
                    Ajouter un logo
                  </span>
                  <span className="text-[9px] text-gray-400 mt-0.5">
                    Format carré (cliquez)
                  </span>
                  <FileInput
                    id="onboarding-logo"
                    type="file"
                    disabled={isUploading}
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </Label>
              )}
            </div>
          </div>

          {/* Banner Dropzone */}
          <div>
            <p className="block text-sm font-semibold text-gray-900 mb-2">
              Visuel de couverture <span className="font-normal text-gray-400">(optionnel)</span>
            </p>
            <div className="relative border-2 border-dashed border-gray-200 rounded-2xl p-4 flex flex-col items-center justify-center bg-gray-50/50 hover:bg-gray-50 transition-colors h-40 group">
              {bannerPreview ? (
                <div className="absolute inset-2 bg-white rounded-xl overflow-hidden group">
                  <Image
                    src={bannerPreview}
                    alt="Bannière restaurant"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover rounded-lg"
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200">
                    <button
                      type="button"
                      onClick={() => removeImage("banner")}
                      aria-label="Supprimer la couverture"
                      className="p-1.5 bg-white/95 rounded-lg text-red-500 hover:bg-white transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <Label
                  htmlFor="onboarding-banner"
                  className="flex h-full w-full cursor-pointer flex-col items-center justify-center text-center"
                >
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-gray-400 group-hover:text-brand-500 group-hover:scale-105 transition-all">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 mt-2.5 block">
                    Ajouter une couverture
                  </span>
                  <span className="text-[9px] text-gray-400 mt-0.5">
                    Format paysage (cliquez)
                  </span>
                  <FileInput
                    id="onboarding-banner"
                    type="file"
                    disabled={isUploading}
                    accept="image/*"
                    onChange={handleBannerUpload}
                    className="hidden"
                  />
                </Label>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Buttons Block */}
      <div className="flex justify-end mt-8 pt-6 border-t border-gray-100">

        <Button onClick={validateAndProceed} disabled={isUploading}>
          Suivant, Localisation
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
