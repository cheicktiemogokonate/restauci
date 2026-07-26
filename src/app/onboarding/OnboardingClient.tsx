"use client";
import Sidebar from "@/components/onboarding/Sidebar";
import StepAddress from "@/components/onboarding/StepAddress";
import StepGeneral from "@/components/onboarding/StepGeneral";
import StepMenu from "@/components/onboarding/StepMenu";
import StepOverview from "@/components/onboarding/StepOverview";
import StepSchedule from "@/components/onboarding/StepSchedule";
import {
  DaySchedule,
  RestaurantConfig,
  SpecialHourException,
} from "@/components/onboarding/types";
import { finaliserOnboarding } from "@/lib/actions/onboarding";
import { AnimatePresence, motion } from "motion/react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

// Initial configuration default states
const INITIAL_CONFIG: RestaurantConfig = {
  general: {
    name: "",
    description: "",
    logoUrl: null,
    bannerUrl: null,
    galleryUrls: [],
  },
  address: {
    country: "Côte d'Ivoire",
    city: "Bouaké",
    commune: "",
    quarter: "",
    fullAddress: "",
    latitude: 7.6905,
    longitude: -5.03,
    phone: "",
    email: "",
    whatsapp: "",
    website: "",
    facebook: "",
  },
  schedule: [
    { day: "Lundi", isOpen: true, openTime: "08:00", closeTime: "22:00" },
    { day: "Mardi", isOpen: true, openTime: "08:00", closeTime: "22:00" },
    { day: "Mercredi", isOpen: true, openTime: "08:00", closeTime: "22:00" },
    { day: "Jeudi", isOpen: true, openTime: "08:00", closeTime: "22:00" },
    { day: "Vendredi", isOpen: true, openTime: "08:00", closeTime: "23:00" },
    { day: "Samedi", isOpen: true, openTime: "09:00", closeTime: "23:00" },
    { day: "Dimanche", isOpen: false, openTime: "09:00", closeTime: "22:00" },
  ],
  exceptions: [],
  socials: {
    facebook: "",
    instagram: "",
    whatsapp: "",
    website: "",
    googleBusiness: "",
    tripadvisor: "",
  },
  settings: {
    category: "bistrot",
    currency: "XOF",
    serviceTypes: ["dine-in", "takeout", "delivery"],
    menuLanguage: "fr",
    taxRate: 18,
    enableOnlineBooking: true,
  },
  menu: [],
};

export default function OnboardingClient({ userId }: { userId: string }) {
  const storageKey = `toutci_onboarding_config:${userId}`;
  const masterStepKey = `toutci_onboarding_step:${userId}`;
  const [currentStep, setCurrentStep] = useState<number>(() => {
    if (typeof window === "undefined") return 1;
    const step = window.localStorage.getItem(masterStepKey);
    return step ? parseInt(step, 10) : 1;
  });
  const [config, setConfig] = useState<RestaurantConfig>(() => {
    if (typeof window === "undefined") return INITIAL_CONFIG;
    try {
      const cached = window.localStorage.getItem(storageKey);
      return cached ? (JSON.parse(cached) as RestaurantConfig) : INITIAL_CONFIG;
    } catch {
      return INITIAL_CONFIG;
    }
  });
  const [completedSteps, setCompletedSteps] = useState<boolean[]>([
    false,
    false,
    false,
    false,
    false,
  ]);
  const [isPending, startTransition] = useTransition();

  // Save changes to localStorage
  const saveToLocal = (
    updatedConfig: RestaurantConfig,
    step: number,
  ) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(updatedConfig));
      localStorage.setItem(masterStepKey, String(step));
    } catch {
      // safe bypass
    }
  };

  const handleUpdateGeneral = (fields: Partial<typeof config.general>) => {
    const updated = { ...config, general: { ...config.general, ...fields } };
    setConfig(updated);
    saveToLocal(updated, currentStep);
  };

  const handleUpdateAddress = (fields: Partial<typeof config.address>) => {
    const updated = { ...config, address: { ...config.address, ...fields } };
    setConfig(updated);
    saveToLocal(updated, currentStep);
  };

  const handleUpdateSchedule = (newSchedule: DaySchedule[]) => {
    const updated = { ...config, schedule: newSchedule };
    setConfig(updated);
    saveToLocal(updated, currentStep);
  };

  const handleUpdateExceptions = (newExceptions: SpecialHourException[]) => {
    const updated = { ...config, exceptions: newExceptions };
    setConfig(updated);
    saveToLocal(updated, currentStep);
  };

  const handleUpdateMenu = (newMenu: typeof config.menu) => {
    const updated = { ...config, menu: newMenu };
    setConfig(updated);
    saveToLocal(updated, currentStep);
  };

  const handleUpdateSettings = (fields: Partial<typeof config.settings>) => {
    const updated = { ...config, settings: { ...config.settings, ...fields } };
    setConfig(updated);
    saveToLocal(updated, currentStep);
  };

  const skipToStep = (stepNum: number) => {
    setCurrentStep(stepNum);
    saveToLocal(config, stepNum);
  };

  const handleNextStep = () => {
    const markCompleted = [...completedSteps];
    markCompleted[currentStep - 1] = true;
    setCompletedSteps(markCompleted);

    const next = Math.min(5, currentStep + 1);
    setCurrentStep(next);
    saveToLocal(config, next);
  };

  const handlePrevStep = () => {
    const prev = Math.max(1, currentStep - 1);
    setCurrentStep(prev);
    saveToLocal(config, prev);
  };

  const handleDeploy = () => {
    // Call the Server Action to save to DB
    startTransition(async () => {
      // Map the config to the data expected by finaliserOnboarding
      const result = await finaliserOnboarding({
        nom: config.general.name,
        telephone: config.address.phone,
        adresse: config.address.fullAddress,
        latitude: config.address.latitude,
        longitude: config.address.longitude,
        modesCommande: config.settings.serviceTypes,
        description: config.general.description || undefined,
        logoUrl: config.general.logoUrl || undefined,
        banniereUrl: config.general.bannerUrl || undefined,
        pays: config.address.country || undefined,
        ville: config.address.city || undefined,
        email: config.address.email || undefined,
        siteWeb: config.address.website || undefined,
        whatsapp: config.address.whatsapp || undefined,
        facebook: config.address.facebook || undefined,
        schedule: config.schedule,
        menu: config.menu,
      });

      if (result?.error) {
        toast(result.error);
        console.error(result.error);
      }
      // Si succès : la Server Action fait le redirect automatiquement
    });
  };

  return (
    <div className="w-full min-h-screen bg-gray-50/50 flex flex-col lg:flex-row antialiased text-gray-800">
      {/* Dynamic Left Stepper Sidebar */}
      <Sidebar
        currentStep={currentStep}
        goToStep={skipToStep}
        completedSteps={completedSteps}
      />

      {/* Main wizard sliding viewports */}
      <main className="flex-1 flex flex-col bg-white border-l border-gray-100 relative min-h-screen">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.28, ease: "easeInOut" }}
            className="flex-1 flex flex-col h-full"
          >
            {currentStep === 1 && (
              <StepGeneral
                data={config.general}
                updateData={handleUpdateGeneral}
                updateSettings={handleUpdateSettings} // Prop to let them choose thematic category preset
                onNext={handleNextStep}
              />
            )}

            {currentStep === 2 && (
              <StepAddress
                data={config.address}
                updateData={handleUpdateAddress}
                onNext={handleNextStep}
                onPrev={handlePrevStep}
              />
            )}

            {currentStep === 3 && (
              <StepSchedule
                schedule={config.schedule}
                exceptions={config.exceptions}
                updateSchedule={handleUpdateSchedule}
                updateExceptions={handleUpdateExceptions}
                onNext={handleNextStep}
                onPrev={handlePrevStep}
              />
            )}

            {currentStep === 4 && (
              <StepMenu
                menu={config.menu}
                updateMenu={handleUpdateMenu}
                onNext={handleNextStep}
                onPrev={handlePrevStep}
              />
            )}

            {currentStep === 5 && (
              <StepOverviewWithLoading
                config={config}
                onDeploy={handleDeploy}
                onPrev={handlePrevStep}
                isPending={isPending}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

// Wrapper component to pass isPending to StepOverview
function StepOverviewWithLoading({
  config,
  onDeploy,
  onPrev,
  isPending,
}: {
  config: RestaurantConfig;
  onDeploy: () => void;
  onPrev: () => void;
  isPending: boolean;
}) {
  return (
    <StepOverview
      config={config}
      onDeploy={onDeploy}
      onPrev={onPrev}
      isDeploying={isPending}
    />
  );
}
