import Image from "next/image";
import {
  Check,
  Image as ImageIcon,
  Sparkles,
  Store,
  Trash2,
  Upload,
} from "lucide-react";
import React, { useState } from "react";
import { GeneralInfo } from "./types";

interface StepGeneralProps {
  data: GeneralInfo;
  updateData: (fields: Partial<GeneralInfo>) => void;
  updateSettings?: (fields: Partial<Record<string, unknown>>) => void;
  onNext: () => void;
}

// Highly appealing Côte d'Ivoire specialized quick presets
const RESTAURANT_PRESETS = [
  {
    name: "La Braise d'Or",
    category: "bistrot",
    serviceTypes: ["dine-in", "takeout", "delivery"],
    label: "Maquis Moderne / Braisés",
    description:
      "Le maquis moderne gourmet d'Abidjan Zone 4. Célèbre pour nos poulets et poissons braisés au feu de bois, notre attiéké de qualité supérieure et nos kédjenous de dinde authentiques.",
    logoUrl: "",
    bannerUrl: "",
    gallery: [],
  },
  {
    name: "L'Atelier Gourmet",
    category: "bistrot",
    serviceTypes: ["dine-in", "takeout"],
    label: "Bistrot Chic & Salon",
    description:
      "Une expérience gastronomique raffinée au Plateau. Notre carte valorise des ingrédients nobles de Côte d'Ivoire, mariant techniques culinaires modernes et excellence locale.",
    logoUrl: "",
    bannerUrl: "",
    gallery: [],
  },
  {
    name: "Abidjan Burger & Chawarma",
    category: "fast-food",
    serviceTypes: ["takeout", "delivery"],
    label: "Fast-Food & Street Food",
    description:
      "Le fast-food urbain rapide et de qualité supérieure à Cocody. Burgers gourmets maison, chawarmas généreux sous pain artisanal et frites d'attiéké ou de patate douce.",
    logoUrl: "",
    bannerUrl: "",
    gallery: [],
  },
  {
    name: "Douceurs d'Éburnie",
    category: "cafeteria",
    serviceTypes: ["dine-in", "takeout"],
    label: "Salon de Thé & Pâtisserie",
    description:
      "Boulangerie-café chaleureuse au Vallon. Brunchs complets le week-end, macarons créatifs au cacao ivoirien d'exception, thés glacés au bissap blanc et citronnelle.",
    logoUrl: "",
    bannerUrl: "",
    gallery: [],
  },
];

export default function StepGeneral({
  data,
  updateData,
  updateSettings,
  onNext,
}: StepGeneralProps) {
  const [logoPreview, setLogoPreview] = useState<string | null>(data.logoUrl);
  const [bannerPreview, setBannerPreview] = useState<string | null>(
    data.bannerUrl,
  );
  const [isUploading, setIsUploading] = useState(false);
  const [descriptionCount, setDescriptionCount] = useState(
    data.description.length,
  );
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const applyPreset = (preset: (typeof RESTAURANT_PRESETS)[0], idx: number) => {
    updateData({
      name: preset.name,
      description: preset.description,
      logoUrl: preset.logoUrl,
      bannerUrl: preset.bannerUrl,
      galleryUrls: preset.gallery,
    });

    if (updateSettings) {
      updateSettings({
        category: preset.category,
        serviceTypes: preset.serviceTypes,
      });
    }

    setLogoPreview(preset.logoUrl);
    setBannerPreview(preset.bannerUrl);
    setDescriptionCount(preset.description.length);
    setSelectedPresetIndex(idx);
    setError(null);
  };

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
      setSelectedPresetIndex(null);
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
      setSelectedPresetIndex(null);
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
      setSelectedPresetIndex(null);
    } else if (type === "banner") {
      setBannerPreview(null);
      updateData({ bannerUrl: null });
      setSelectedPresetIndex(null);
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
    setError(null);
    onNext();
  };

  return (
    <div className="flex-1 max-w-4xl p-6 lg:p-10 overflow-y-auto">
      {/* Step Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-10 h-10 bg-emerald-50 text-brand-500 rounded-xl flex items-center justify-center ring-1 ring-emerald-100">
            <Store className="w-5 h-5" />
          </div>
          <span className="text-xs font-mono text-gray-400 font-semibold uppercase tracking-wider">
            Étape 1/5
          </span>
        </div>
        <h1 className="text-2xl font-bold font-display text-gray-900 tracking-tight leading-none">
          Enseigne & Identité visuelle
        </h1>
        <p className="text-sm text-gray-500 mt-2 font-sans">
          Démarrez instantanément avec l&apos;un de nos prototypes de restaurant
          optimisés pour le marché ivoirien, ou remplissez votre propre
          formulaire.
        </p>
      </div>

      {/* Modern High-Impact Preset Archetypes Grid inside the container */}
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-3 flex items-center space-x-1.5 font-mono">
          <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
          <span>Gabarit de départ rapide</span>
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {RESTAURANT_PRESETS.map((preset, idx) => {
            const isSelected =
              selectedPresetIndex === idx || data.name === preset.name;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => applyPreset(preset, idx)}
                className={`relative p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? "border-emerald-500 bg-emerald-50/20 ring-2 ring-emerald-500/20"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                {isSelected && (
                  <span className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full p-0.5">
                    <Check className="w-3 h-3 stroke-3" />
                  </span>
                )}
                <span className="font-semibold text-xs text-gray-900 block truncate">
                  {preset.name}
                </span>
                <span className="text-[10px] text-gray-400 block mt-0.5">
                  {preset.label}
                </span>
                <span className="text-[10px] text-gray-500 block mt-1 line-clamp-2">
                  {preset.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-8 bg-white border border-gray-100 rounded-2xl p-6 lg:p-8 shadow-sm">
        {/* Error Messaging */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-medium font-sans">
            ⚠️ {error}
          </div>
        )}

        {/* Input Fields */}
        <div className="grid grid-cols-1 gap-6">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-semibold text-gray-900 mb-2"
            >
              Nom de l&apos;établissement *
            </label>
            <input
              type="text"
              id="name"
              name="restaurant-name"
              placeholder="Ex: Le Krystal, Maquis la Braise"
              value={data.name}
              onChange={(e) => {
                updateData({ name: e.target.value });
                setSelectedPresetIndex(null);
              }}
              className="w-full px-4 py-3 bg-white border border-gray-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-50 rounded-xl text-sm transition-all font-sans outline-none text-gray-800 placeholder-gray-400"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label
                htmlFor="description"
                className="block text-sm font-semibold text-gray-900"
              >
                Slogan & Description *
              </label>
              <span
                className={`text-[10px] font-mono ${descriptionCount > 300 ? "text-red-500" : "text-gray-400"}`}
              >
                {descriptionCount} / 300
              </span>
            </div>
            <textarea
              id="description"
              name="description"
              rows={3}
              maxLength={300}
              placeholder="Décrivez en quelques mots l'histoire culinaire du restaurant..."
              value={data.description}
              onChange={(e) => {
                updateData({ description: e.target.value });
                setDescriptionCount(e.target.value.length);
                setSelectedPresetIndex(null);
              }}
              className="w-full px-4 py-3 bg-white border border-gray-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-50 rounded-xl text-sm transition-all font-sans outline-none text-gray-800 placeholder-gray-400 resize-none"
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
                <label className="cursor-pointer text-center flex flex-col items-center h-full justify-center w-full">
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-gray-400 group-hover:text-brand-500 group-hover:scale-105 transition-all">
                    <Upload className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 mt-2.5 block">
                    Ajouter un logo
                  </span>
                  <span className="text-[9px] text-gray-400 mt-0.5">
                    Format carré (cliquez)
                  </span>
                  <input
                    type="file"
                    disabled={isUploading}
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
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
                <label className="cursor-pointer text-center flex flex-col items-center h-full justify-center w-full">
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-gray-400 group-hover:text-brand-500 group-hover:scale-105 transition-all">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 mt-2.5 block">
                    Ajouter une couverture
                  </span>
                  <span className="text-[9px] text-gray-400 mt-0.5">
                    Format paysage (cliquez)
                  </span>
                  <input
                    type="file"
                    disabled={isUploading}
                    accept="image/*"
                    onChange={handleBannerUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Buttons Block */}
      <div className="flex justify-end mt-8 pt-6 border-t border-gray-100">
        <button
          type="button"
          onClick={validateAndProceed}
          disabled={isUploading}
          className="px-6 py-3 bg-brand-green text-white text-sm font-semibold rounded-xl inline-flex items-center space-x-2 shadow-sm cursor-pointer transition-all active:scale-[0.98]"
        >
          <span>Suivant, Localisation</span>
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
