import { Check, Info } from "lucide-react";
import type { CategorieOption, PlatWizardData } from "./types";

interface StepApercuProps {
  formData: PlatWizardData;
  categories: CategorieOption[];
}

export default function StepApercu({ formData, categories }: StepApercuProps) {
  const categorieLabel = formData.categorieId
    ? categories.find((c) => c.id === formData.categorieId)?.nom
    : formData.newCategorieName.trim() || null;

  const isReady =
    formData.nom.trim() &&
    formData.prix.trim() &&
    (formData.categorieId || formData.newCategorieName.trim());

  return (
    <div className="max-w-170 space-y-5">
      <div className="bg-linear-to-r from-[#036B3A]/10 to-[#036B3A]/5 border border-[#036B3A]/20 rounded-xl p-6">
        <div className="flex gap-5">
          {formData.image ? (
            <img
              src={formData.image}
              alt={formData.nom}
              referrerPolicy="no-referrer"
              className="w-24 h-24 rounded-xl object-cover shrink-0"
            />
          ) : (
            <div className="w-24 h-24 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0">
              <span className="text-[10px] text-zinc-400 text-center px-2">
                Sans photo
              </span>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-[#036B3A] mb-1 uppercase tracking-widest">
              {categorieLabel || "Sans catégorie"}
            </p>
            <h3 className="text-lg font-bold text-zinc-900 mb-1">
              {formData.nom || "Plat sans titre"}
            </h3>
            <p className="text-sm text-zinc-500 mb-3">
              {formData.description || "Aucune description"}
            </p>
            <div className="flex items-center gap-3">
              <span className="font-bold text-[#036B3A]">
                {formData.prix ? `${formData.prix} FCFA` : "—"}
              </span>
              {!formData.disponible && (
                <span className="text-[10px] bg-zinc-200 text-zinc-500 px-2 py-0.5 rounded-full">
                  Indisponible
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {isReady ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
          <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
          <p className="text-xs text-green-700">
            Votre plat est prêt à être ajouté à votre carte !
          </p>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
          <Info className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-700">
            Assurez-vous que le plat a un nom, un prix et une catégorie.
          </p>
        </div>
      )}
    </div>
  );
}
