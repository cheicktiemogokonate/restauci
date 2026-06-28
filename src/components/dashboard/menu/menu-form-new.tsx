"use client";

import { createPlatWizardAction } from "@/lib/actions/menu";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Layers,
  Loader2,
  UtensilsCrossed,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import StepApercu from "./wizard/StepApercu";
import StepCategorie from "./wizard/StepCategorie";
import StepInfo from "./wizard/StepInfo";
import type {
  CategorieOption,
  PlatWizardData,
  Step,
  StepNumber,
} from "./wizard/types";

const steps: Step[] = [
  {
    id: 1,
    title: "Informations du plat",
    desc: "Nom, description, prix et photo.",
    icon: UtensilsCrossed,
  },
  {
    id: 2,
    title: "Catégorie",
    desc: "Classez le plat et définissez sa disponibilité.",
    icon: Layers,
  },
  {
    id: 3,
    title: "Aperçu",
    desc: "Vérifiez le plat avant de l'ajouter à votre carte.",
    icon: Eye,
  },
];

const fadeVariants = {
  initial: { opacity: 0, x: 15 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: "easeOut" as const },
  },
  exit: {
    opacity: 0,
    x: -15,
    transition: { duration: 0.2, ease: "easeIn" as const },
  },
};

const INPUT_CLS =
  "w-full px-4 py-2.5 rounded-lg border border-zinc-200 focus:border-[#036B3A] focus:ring-1 focus:ring-[#036B3A] outline-none transition-all text-sm";

interface PlatFormWizardProps {
  categories: CategorieOption[];
}

export default function PlatFormWizard({ categories }: PlatFormWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<StepNumber>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [categorieMode, setCategorieMode] = useState<"existing" | "new">(
    categories.length > 0 ? "existing" : "new",
  );
  const [formData, setFormData] = useState<PlatWizardData>({
    nom: "",
    description: "",
    prix: "",
    image: null,
    categorieId: "",
    newCategorieName: "",
    disponible: true,
  });

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (url: string | null) => {
    setFormData((prev) => ({ ...prev, image: url }));
  };

  const handleCategorieModeChange = (mode: "existing" | "new") => {
    setCategorieMode(mode);
    setFormData((prev) => ({
      ...prev,
      categorieId: mode === "existing" ? prev.categorieId : "",
      newCategorieName: mode === "new" ? prev.newCategorieName : "",
    }));
  };

  const hasValidCategorie =
    categorieMode === "existing"
      ? Boolean(formData.categorieId)
      : Boolean(formData.newCategorieName.trim());

  const nextStep = () => {
    if (currentStep < 3) setCurrentStep((prev) => (prev + 1) as StepNumber);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep((prev) => (prev - 1) as StepNumber);
  };

  const handlePrimaryAction = async () => {
    if (currentStep < 3) {
      nextStep();
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const result = await createPlatWizardAction({
      ...formData,
      categorieId:
        categorieMode === "existing" ? formData.categorieId : undefined,
      newCategorieName:
        categorieMode === "new" ? formData.newCategorieName.trim() : undefined,
    });

    if (result?.error) {
      setSubmitError(result.error);
      setIsSubmitting(false);
    }
  };

  const isNextDisabled =
    (currentStep === 1 && (!formData.nom.trim() || !formData.prix.trim())) ||
    (currentStep === 2 && !hasValidCategorie) ||
    (currentStep === 3 &&
      (!formData.nom.trim() || !formData.prix.trim() || !hasValidCategorie));

  const activeStep = steps[currentStep - 1];

  return (
    <div className="w-full mx-auto max-w-7xl bg-white flex h-screen">
      <aside className="w-75 bg-[#F8F9FA] border-r border-zinc-100 p-8 flex flex-col justify-between shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-10">
            <div className="w-9 h-9 bg-[#036B3A] rounded-xl flex items-center justify-center text-white shadow-sm shadow-[#036B3A]/30">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold text-zinc-900 tracking-tight">
              Restau<span className="text-[#036B3A]">CI</span>
            </span>
          </div>
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-zinc-900 mb-1">
              Ajouter un plat
            </h1>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Votre carte se compose de l&apos;ensemble de vos plats.
            </p>
          </div>
          <div className="relative flex flex-col gap-6">
            <div className="absolute left-4.5 top-4 bottom-4 w-0.5 bg-zinc-200 z-0" />
            {steps.map((s) => {
              const isCompleted = currentStep > s.id;
              const isActive = currentStep === s.id;
              return (
                <div
                  key={s.id}
                  className="flex gap-4 relative z-10 cursor-pointer"
                  onClick={() => setCurrentStep(s.id as StepNumber)}
                >
                  <div className="flex items-center justify-center shrink-0">
                    {isCompleted ? (
                      <div className="w-9 h-9 bg-[#036B3A] rounded-full flex items-center justify-center text-white transition-all duration-300">
                        <svg
                          viewBox="0 0 24 24"
                          className="w-4 h-4 stroke-current stroke-3 fill-none"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    ) : (
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300 text-xs font-semibold
                          ${isActive ? "border-[#036B3A] bg-white text-[#036B3A] shadow-sm" : "border-zinc-200 bg-white text-zinc-400"}`}
                      >
                        {s.id}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col pt-0.5">
                    <span
                      className={`text-sm font-semibold transition-colors duration-200 ${isActive || isCompleted ? "text-zinc-900" : "text-zinc-400"}`}
                    >
                      {s.title}
                    </span>
                    {isActive && (
                      <p className="text-[11px] text-zinc-500 leading-normal mt-0.5 max-w-50">
                        {s.desc}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col justify-between bg-white relative">
        <div className="flex-1 px-10 py-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial="initial"
              animate="animate"
              exit="exit"
              variants={fadeVariants}
              className="h-full"
            >
              <div className="flex items-center gap-3 mb-1">
                <div className="w-9 h-9 bg-[#E6F0EA] rounded-full flex items-center justify-center text-[#036B3A]">
                  {React.createElement(activeStep.icon, {
                    className: "w-4 h-4",
                  })}
                </div>
                <span className="text-xs font-medium text-zinc-400">
                  Étape {currentStep}/3
                </span>
              </div>
              <h2 className="text-2xl font-bold text-zinc-900 mt-2 mb-1">
                {activeStep.title}
              </h2>
              <p className="text-sm text-zinc-500 mb-6">
                {currentStep === 1 &&
                  "Commençons par les informations de base de votre plat."}
                {currentStep === 2 &&
                  "Choisissez une catégorie et indiquez si le plat est disponible."}
                {currentStep === 3 &&
                  "Vérifiez l'aperçu avant d'ajouter ce plat à votre carte."}
              </p>

              {currentStep === 1 && (
                <StepInfo
                  formData={formData}
                  onChange={handleInputChange}
                  onImageChange={handleImageChange}
                  inputCls={INPUT_CLS}
                />
              )}

              {currentStep === 2 && (
                <StepCategorie
                  formData={formData}
                  categories={categories}
                  onChange={handleInputChange}
                  onDisponibleChange={(disponible) =>
                    setFormData((prev) => ({ ...prev, disponible }))
                  }
                  onCategorieModeChange={handleCategorieModeChange}
                  categorieMode={categorieMode}
                  inputCls={INPUT_CLS}
                />
              )}

              {currentStep === 3 && (
                <StepApercu formData={formData} categories={categories} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <footer className="h-20 border-t border-zinc-100 px-10 flex items-center justify-between shrink-0 bg-white z-20">
          <div>
            {currentStep > 1 && (
              <button
                onClick={prevStep}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-zinc-600 hover:bg-zinc-50 border border-zinc-200 transition-all flex items-center gap-1.5 shadow-sm"
              >
                <ChevronLeft className="w-4 h-4" /> Précédent
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {submitError && (
              <p className="text-xs text-red-600 max-w-xs">{submitError}</p>
            )}
            <button
              type="button"
              onClick={() => router.push("/restaurateur/menu")}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-zinc-500 hover:text-zinc-800 transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handlePrimaryAction}
              disabled={isNextDisabled || isSubmitting}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#036B3A] hover:bg-[#02562E] disabled:bg-zinc-300 text-white transition-all flex items-center gap-1.5 shadow-md shadow-[#036B3A]/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Ajout en cours...
                </>
              ) : (
                <>
                  {currentStep === 3 ? "Ajouter le plat" : "Suivant"}{" "}
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
}
