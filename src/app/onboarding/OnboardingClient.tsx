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

const ONBOARDING_DRAFT_VERSION = "3";

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
    city: "",
    commune: "",
    quarter: "",
    fullAddress: "",
    latitude: 0,
    longitude: 0,
    phone: "",
    email: "",
    whatsapp: "",
    website: "",
    facebook: "",
  },
  schedule: [
    { day: "Lundi", isOpen: false, openTime: "08:00", closeTime: "22:00" },
    { day: "Mardi", isOpen: false, openTime: "08:00", closeTime: "22:00" },
    { day: "Mercredi", isOpen: false, openTime: "08:00", closeTime: "22:00" },
    { day: "Jeudi", isOpen: false, openTime: "08:00", closeTime: "22:00" },
    { day: "Vendredi", isOpen: false, openTime: "08:00", closeTime: "23:00" },
    { day: "Samedi", isOpen: false, openTime: "09:00", closeTime: "23:00" },
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
    establishmentType: "restaurant",
    category: "",
    currency: "XOF",
    serviceTypes: [],
    menuLanguage: "fr",
    enableOnlineBooking: true,
  },
  menu: [],
};

interface OnboardingPlan {
  name: string;
  maxDishes: number | null;
  categories: string[];
}

export default function OnboardingClient({
  userId,
  plan,
}: {
  userId: string;
  plan: OnboardingPlan;
}) {
  const storageKey = `toutci_onboarding_config:${userId}`;
  const masterStepKey = `toutci_onboarding_step:${userId}`;
  const draftVersionKey = `toutci_onboarding_version:${userId}`;
  const [currentStep, setCurrentStep] = useState<number>(() => {
    if (typeof window === "undefined") return 1;
    const step = window.localStorage.getItem(masterStepKey);
    const parsedStep = step ? parseInt(step, 10) : 1;
    const isLegacyDraft =
      window.localStorage.getItem(draftVersionKey) !==
      ONBOARDING_DRAFT_VERSION;
    if (isLegacyDraft && parsedStep >= 5) return 1;
    return Math.min(5, Math.max(1, parsedStep));
  });
  const [config, setConfig] = useState<RestaurantConfig>(() => {
    if (typeof window === "undefined") return INITIAL_CONFIG;
    try {
      const cached = window.localStorage.getItem(storageKey);
      if (!cached) return INITIAL_CONFIG;

      const parsed = JSON.parse(cached) as RestaurantConfig;
      const isLegacyDraft =
        window.localStorage.getItem(draftVersionKey) !==
        ONBOARDING_DRAFT_VERSION;
      const migratedMenu = Array.isArray(parsed.menu)
        ? parsed.menu
            .map((item) => ({
              ...item,
              category: plan.categories.includes(item.category)
                ? item.category
                : (plan.categories[0] ?? ""),
            }))
            .slice(0, 1)
        : [];

      return {
        ...parsed,
        settings: {
          ...INITIAL_CONFIG.settings,
          ...parsed.settings,
          establishmentType: "restaurant",
          category: isLegacyDraft ? "" : parsed.settings?.category || "",
          serviceTypes: isLegacyDraft
            ? []
            : parsed.settings?.serviceTypes || [],
          currency: "XOF",
        },
        menu: migratedMenu,
      };
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
      localStorage.setItem(draftVersionKey, ONBOARDING_DRAFT_VERSION);
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
        establishmentType: config.settings.establishmentType,
        cuisines: config.settings.category ? [config.settings.category] : [],
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
    <div className="flex min-h-screen w-full flex-col bg-gray-50/50 text-gray-800 antialiased lg:h-dvh lg:min-h-0 lg:flex-row lg:overflow-hidden">
      {/* Dynamic Left Stepper Sidebar */}
      <Sidebar
        currentStep={currentStep}
        goToStep={skipToStep}
        completedSteps={completedSteps}
      />

      {/* Main wizard sliding viewports */}
      <main className="relative flex min-h-screen flex-1 flex-col border-l border-gray-100 bg-white lg:h-dvh lg:min-h-0 lg:overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.28, ease: "easeInOut" }}
            className="flex h-full min-h-0 flex-1 flex-col"
          >
            {currentStep === 1 && (
              <StepGeneral
                data={config.general}
                updateData={handleUpdateGeneral}
                settings={config.settings}
                updateSettings={handleUpdateSettings}
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
                categories={plan.categories}
                planName={plan.name}
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
