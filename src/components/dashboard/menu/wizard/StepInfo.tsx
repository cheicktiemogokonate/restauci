"use client";

import { DollarSign, Loader2, Trash2, Upload } from "lucide-react";
import React, { useRef, useState } from "react";
import type { PlatWizardData } from "./types";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;

interface StepInfoProps {
  formData: PlatWizardData;
  onChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => void;
  onImageChange: (url: string | null) => void;
  inputCls: string;
}

export default function StepInfo({
  formData,
  onChange,
  onImageChange,
  inputCls,
}: StepInfoProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Le format doit être JPG, PNG ou WebP.");
      e.target.value = "";
      return;
    }

    if (file.size > MAX_SIZE) {
      setError("Le fichier doit faire moins de 5 Mo.");
      e.target.value = "";
      return;
    }

    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);

      const res = await fetch("/api/media/upload", {
        method: "POST",
        body,
      });

      const data = (await res.json()) as { url?: string; error?: string };

      if (!res.ok || !data.url) {
        setError(data.error ?? "Erreur lors de l'envoi de l'image.");
        return;
      }

      onImageChange(data.url);
    } catch {
      setError("Erreur lors de l'envoi de l'image.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeImage = () => {
    onImageChange(null);
    setError(null);
  };

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept="image/jpeg,image/png,image/webp"
      onChange={handleFileChange}
      disabled={uploading}
      className="hidden"
    />
  );

  return (
    <div className="max-w-150 space-y-5">
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1.5">
          Nom du plat *
        </label>
        <input
          type="text"
          name="nom"
          value={formData.nom}
          onChange={onChange}
          placeholder="Ex: Garba Royal, Attiéké poisson..."
          className={inputCls}
        />
        <p className="text-[11px] text-zinc-400 mt-1.5">
          Ce nom sera affiché aux clients sur votre carte.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1.5">
          Description{" "}
          <span className="text-zinc-400 font-normal">(optionnel)</span>
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={onChange}
          rows={4}
          maxLength={300}
          placeholder="Décrivez les ingrédients, la préparation, les accompagnements..."
          className={`${inputCls} resize-none`}
        />
        <p className="text-[11px] text-zinc-400 mt-1.5">
          Max. 300 caractères ({formData.description.length}/300)
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1.5">
          Prix (FCFA) *
        </label>
        <div className="relative">
          <DollarSign className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
          <input
            type="text"
            name="prix"
            value={formData.prix}
            onChange={onChange}
            placeholder="Ex: 3500"
            className={`${inputCls} pl-9`}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1.5">
          Photo du plat{" "}
          <span className="text-zinc-400 font-normal">(optionnel)</span>
        </label>
        <div className="relative border-2 border-dashed border-zinc-200 rounded-xl min-h-40 flex flex-col items-center justify-center overflow-hidden group">
          {formData.image ? (
            <>
              <img
                src={formData.image}
                alt="Photo du plat"
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover rounded-xl"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition-opacity rounded-xl">
                <button
                  type="button"
                  onClick={removeImage}
                  disabled={uploading}
                  className="p-2 bg-white/95 rounded-lg text-red-500 hover:bg-white transition-colors disabled:opacity-50"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <label className="cursor-pointer px-3 py-2 bg-white/95 rounded-lg text-xs font-semibold text-zinc-700 hover:bg-white transition-colors">
                  Changer
                  {fileInput}
                </label>
              </div>
            </>
          ) : (
            <label className="cursor-pointer w-full p-8 flex flex-col items-center justify-center hover:bg-zinc-50 transition-colors">
              {uploading ? (
                <Loader2 className="w-6 h-6 text-[#036B3A] mb-2 animate-spin" />
              ) : (
                <Upload className="w-6 h-6 text-zinc-400 group-hover:text-[#036B3A] mb-2 transition-colors" />
              )}
              <span className="text-xs font-medium text-zinc-600">
                {uploading
                  ? "Envoi en cours..."
                  : "Cliquez pour ajouter une photo"}
              </span>
              <span className="text-[10px] text-zinc-400 mt-1">
                JPG, PNG, WebP — max. 5 Mo — format carré recommandé
              </span>
              {fileInput}
            </label>
          )}
        </div>
        {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
      </div>
    </div>
  );
}
