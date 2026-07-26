"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { updatePlatAction } from "@/lib/actions/menu";
import type { PlatAvecCategorie } from "@/lib/db/types";
import { Loader2, Trash2, Upload } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;

interface CategorieOption {
  id: string;
  nom: string;
}

interface PlatEditDialogProps {
  plat: PlatAvecCategorie;
  categories: CategorieOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PlatEditDialog({
  plat,
  categories,
  open,
  onOpenChange,
}: PlatEditDialogProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [form, setForm] = useState({
    nom: plat.nom,
    description: plat.description ?? "",
    prix: String(plat.prix),
    photoUrl: plat.photoUrl ?? (null as string | null),
    categorieId: plat.categorieId,
    disponible: plat.disponible,
  });

  useEffect(() => {
    if (open) {
      Promise.resolve().then(() => {
        setForm({
          nom: plat.nom,
          description: plat.description ?? "",
          prix: String(plat.prix),
          photoUrl: plat.photoUrl ?? null,
          categorieId: plat.categorieId,
          disponible: plat.disponible,
        });
        setError(null);
        setUploadError(null);
      });
    }
  }, [open, plat]);

  const inputCls =
    "w-full px-4 py-2.5 rounded-lg border border-zinc-200 focus:border-[#036B3A] focus:ring-1 focus:ring-[#036B3A] outline-none transition-all text-sm";

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setUploadError("Le format doit être JPG, PNG ou WebP.");
      e.target.value = "";
      return;
    }

    if (file.size > MAX_SIZE) {
      setUploadError("Le fichier doit faire moins de 5 Mo.");
      e.target.value = "";
      return;
    }

    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);

      const res = await fetch("/api/media/upload", { method: "POST", body });
      const data = (await res.json()) as { url?: string; error?: string };

      if (!res.ok || !data.url) {
        setUploadError(data.error ?? "Erreur lors de l'envoi de l'image.");
        return;
      }

      setForm((prev) => ({ ...prev, photoUrl: data.url! }));
    } catch {
      setUploadError("Erreur lors de l'envoi de l'image.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const result = await updatePlatAction({
      platId: plat.id,
      nom: form.nom.trim(),
      description: form.description.trim() || undefined,
      prix: form.prix,
      photoUrl: form.photoUrl,
      categorieId: form.categorieId,
      disponible: form.disponible,
    });

    if (result?.error) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }

    onOpenChange(false);
    router.refresh();
    toast.success("Plat enregistré.");
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle>Modifier le plat</DialogTitle>
          <DialogDescription>
            Les changements seront appliqués immédiatement à votre carte.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">
              Nom du plat *
            </label>
            <input
              type="text"
              value={form.nom}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, nom: e.target.value }))
              }
              className={inputCls}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              rows={3}
              maxLength={300}
              className={`${inputCls} resize-none`}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                Prix (FCFA) *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={form.prix}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, prix: e.target.value }))
                  }
                  className={`${inputCls} pr-14`}
                  required
                />
                <span className="absolute right-3 top-2.5 text-xs font-semibold text-zinc-400">
                  FCFA
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                Catégorie *
              </label>
              <select
                value={form.categorieId}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, categorieId: e.target.value }))
                }
                className={inputCls}
                required
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nom}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">
              Photo du plat
            </label>
            <div className="relative border-2 border-dashed border-zinc-200 rounded-xl min-h-30 flex flex-col items-center justify-center overflow-hidden group">
              {form.photoUrl ? (
                <>
                  <Image
                    src={form.photoUrl}
                    alt="Photo du plat"
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 w-full h-full object-cover rounded-xl"
                    fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition-opacity rounded-xl">
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() =>
                        setForm((prev) => ({ ...prev, photoUrl: null }))
                      }
                      disabled={uploading}
                      aria-label="Supprimer la photo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <label className="cursor-pointer px-3 py-2 bg-white/95 rounded-lg text-xs font-semibold text-zinc-700 hover:bg-white transition-colors">
                      Changer
                      <input
                        ref={inputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleFileChange}
                        disabled={uploading}
                        className="hidden"
                      />
                    </label>
                  </div>
                </>
              ) : (
                <label className="cursor-pointer w-full p-6 flex flex-col items-center justify-center hover:bg-zinc-50 transition-colors">
                  {uploading ? (
                    <Loader2 className="w-5 h-5 text-[#036B3A] mb-2 animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5 text-zinc-400 mb-2" />
                  )}
                  <span className="text-xs font-medium text-zinc-600">
                    {uploading ? "Envoi en cours..." : "Ajouter une photo"}
                  </span>
                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            {uploadError && (
              <p className="text-xs text-red-600 mt-1">{uploadError}</p>
            )}
          </div>

          <div className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-zinc-800">Disponible</p>
              <p className="text-xs text-zinc-500">
                Visible sur la carte client
              </p>
            </div>
            <Switch
              checked={form.disponible}
              onCheckedChange={(disponible) =>
                setForm((prev) => ({ ...prev, disponible }))
              }
              aria-label="Rendre le plat disponible"
              className="data-checked:bg-[#036B3A]"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                uploading ||
                !form.nom.trim() ||
                !form.prix.trim()
              }
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Enregistrer"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
