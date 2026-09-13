"use client";

import { Info } from "lucide-react";
import { Input } from "@/components/motion/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/motion/select";
import { Switch } from "@/components/motion/switch";
import type { CategorieOption, PlatWizardData } from "./types";

interface StepCategorieProps {
  formData: PlatWizardData;
  categories: CategorieOption[];
  onFieldChange: (name: keyof PlatWizardData, value: string) => void;
  onDisponibleChange: (disponible: boolean) => void;
  onCategoryChange: (categoryId: string) => void;
  onCategorieModeChange: (mode: "existing" | "new") => void;
  categorieMode: "existing" | "new";
  inputCls: string;
}

export default function StepCategorie({
  formData,
  categories,
  onFieldChange,
  onDisponibleChange,
  onCategoryChange,
  onCategorieModeChange,
  categorieMode,
  inputCls,
}: StepCategorieProps) {
  const hasExistingCategories = categories.length > 0;

  return (
    <div className="max-w-150 space-y-6">
      <div className="border border-zinc-200 rounded-xl p-5 bg-white space-y-4">
        <h3 className="text-sm font-semibold text-zinc-900">Catégorie *</h3>
        <p className="text-xs text-zinc-500">
          Classez ce plat dans une catégorie de votre carte (Entrées, Plats,
          Desserts…).
        </p>

        {hasExistingCategories && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onCategorieModeChange("existing")}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-all ${
                categorieMode === "existing"
                  ? "border-[#036B3A] bg-[#E6F0EA] text-[#036B3A]"
                  : "border-zinc-200 text-zinc-500 hover:bg-zinc-50"
              }`}
            >
              Catégorie existante
            </button>
            <button
              type="button"
              onClick={() => onCategorieModeChange("new")}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-all ${
                categorieMode === "new"
                  ? "border-[#036B3A] bg-[#E6F0EA] text-[#036B3A]"
                  : "border-zinc-200 text-zinc-500 hover:bg-zinc-50"
              }`}
            >
              Nouvelle catégorie
            </button>
          </div>
        )}

        {categorieMode === "existing" && hasExistingCategories ? (
          <Select
            value={formData.categorieId}
            onValueChange={onCategoryChange}
          >
            <SelectTrigger ariaLabel="Catégorie du plat" className="h-12">
              <SelectValue placeholder="Sélectionnez une catégorie" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.nom}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            name="newCategorieName"
            value={formData.newCategorieName}
            onChange={(value) => onFieldChange("newCategorieName", value)}
            placeholder="Ex: Plats principaux, Boissons..."
            classNames={{ field: inputCls }}
          />
        )}

        {!hasExistingCategories && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700">
              Vous n&apos;avez pas encore de catégorie. Créez-en une pour
              classer ce plat.
            </p>
          </div>
        )}
      </div>

      <div className="border border-zinc-200 rounded-xl p-5 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">
              Disponibilité
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Les plats indisponibles ne sont pas visibles par les clients.
            </p>
          </div>
          <Switch
            checked={formData.disponible}
            onCheckedChange={onDisponibleChange}
            ariaLabel="Rendre ce plat disponible"
            className="data-checked:bg-[#036B3A]"
          />
        </div>
        <p className="text-xs text-zinc-400 mt-3">
          {formData.disponible
            ? "Ce plat sera visible sur votre carte."
            : "Ce plat sera masqué aux clients."}
        </p>
      </div>
    </div>
  );
}
