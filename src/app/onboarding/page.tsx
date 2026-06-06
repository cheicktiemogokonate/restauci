"use client";
import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import Sidebar from "@/components/onboarding/Sidebar";
import StepGeneral from "@/components/onboarding/StepGeneral";
import StepAddress from "@/components/onboarding/StepAddress";
import StepSchedule from "@/components/onboarding/StepSchedule";
import StepOverview from "@/components/onboarding/StepOverview";
import DashboardView from "@/components/onboarding/DashboardView";
import { DaySchedule, RestaurantConfig, SpecialHourException } from "@/components/onboarding/types";


// Initial configuration default states
const INITIAL_CONFIG: RestaurantConfig = {
  general: {
    name: "",
    description: "",
    logoUrl: null,
    bannerUrl: null,
    galleryUrls: []
  },
  address: {
    country: "Côte d'Ivoire",
    city: "Abidjan",
    commune: "Marcory",
    quarter: "Zone 4",
    fullAddress: "Rue des Jardins, Immeuble 12, Marcory Zone 4, Abidjan, Côte d'Ivoire",
    latitude: 5.3065,
    longitude: -4.0133,
    phone: "+225 07 45 89 22 10",
    email: "contact@monrestaurant.ci",
    whatsapp: "+225 07 45 89 22 10",
    website: "https://www.monrestaurant.ci",
    facebook: ""
  },
  schedule: [
    { day: "Lundi", isOpen: true, openTime: "08:00", closeTime: "22:00" },
    { day: "Mardi", isOpen: true, openTime: "08:00", closeTime: "22:00" },
    { day: "Mercredi", isOpen: true, openTime: "08:00", closeTime: "22:00" },
    { day: "Jeudi", isOpen: true, openTime: "08:00", closeTime: "22:00" },
    { day: "Vendredi", isOpen: true, openTime: "08:00", closeTime: "23:00" },
    { day: "Samedi", isOpen: true, openTime: "09:00", closeTime: "23:00" },
    { day: "Dimanche", isOpen: false, openTime: "09:00", closeTime: "22:00" }
  ],
  exceptions: [
    { id: "exc-christmas", date: "2026-12-25", label: "Noël", isOpen: true, openTime: "11:00", closeTime: "16:00" },
    { id: "exc-newyear", date: "2027-01-01", label: "Jour de l'An", isOpen: false, openTime: "CLOSED", closeTime: "CLOSED" }
  ],
  socials: {
    facebook: "",
    instagram: "",
    whatsapp: "",
    website: "",
    googleBusiness: "",
    tripadvisor: ""
  },
  settings: {
    category: "bistrot",
    currency: "XOF",
    serviceTypes: ["dine-in", "takeout", "delivery"],
    menuLanguage: "fr",
    taxRate: 18,
    enableOnlineBooking: true
  }
};

const STORAGE_KEY = "restauci_onboarding_config";
const MASTER_STEP_KEY = "restauci_onboarding_step";
const DEPLOYED_KEY = "restauci_onboarding_deployed";

export default function App() {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [config, setConfig] = useState<RestaurantConfig>(INITIAL_CONFIG);
  const [completedSteps, setCompletedSteps] = useState<boolean[]>([false, false, false, false]);
  const [isDeployed, setIsDeployed] = useState<boolean>(false);

  // Restore cache configurations
  useEffect(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      const step = localStorage.getItem(MASTER_STEP_KEY);
      const deployed = localStorage.getItem(DEPLOYED_KEY);

      if (cached) {
        setConfig(JSON.parse(cached));
      }
      if (step) {
        setCurrentStep(parseInt(step));
      }
      if (deployed === "true") {
        setIsDeployed(true);
      }
    } catch {
      console.warn("Storage failed to restore.");
    }
  }, []);

  // Save changes to localStorage
  const saveToLocal = (updatedConfig: RestaurantConfig, step: number, deployed: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedConfig));
      localStorage.setItem(MASTER_STEP_KEY, String(step));
      localStorage.setItem(DEPLOYED_KEY, String(deployed));
    } catch {
      // safe bypass
    }
  };

  const handleUpdateGeneral = (fields: Partial<typeof config.general>) => {
    const updated = { ...config, general: { ...config.general, ...fields } };
    setConfig(updated);
    saveToLocal(updated, currentStep, isDeployed);
  };

  const handleUpdateAddress = (fields: Partial<typeof config.address>) => {
    const updated = { ...config, address: { ...config.address, ...fields } };
    setConfig(updated);
    saveToLocal(updated, currentStep, isDeployed);
  };

  const handleUpdateSchedule = (newSchedule: DaySchedule[]) => {
    const updated = { ...config, schedule: newSchedule };
    setConfig(updated);
    saveToLocal(updated, currentStep, isDeployed);
  };

  const handleUpdateExceptions = (newExceptions: SpecialHourException[]) => {
    const updated = { ...config, exceptions: newExceptions };
    setConfig(updated);
    saveToLocal(updated, currentStep, isDeployed);
  };

  const handleUpdateSocials = (fields: Partial<typeof config.socials>) => {
    const updated = { ...config, socials: { ...config.socials, ...fields } };
    setConfig(updated);
    saveToLocal(updated, currentStep, isDeployed);
  };

  const handleUpdateSettings = (fields: Partial<typeof config.settings>) => {
    const updated = { ...config, settings: { ...config.settings, ...fields } };
    setConfig(updated);
    saveToLocal(updated, currentStep, isDeployed);
  };

  const skipToStep = (stepNum: number) => {
    setCurrentStep(stepNum);
    saveToLocal(config, stepNum, isDeployed);
  };

  const handleNextStep = () => {
    const markCompleted = [...completedSteps];
    markCompleted[currentStep - 1] = true;
    setCompletedSteps(markCompleted);

    const next = Math.min(4, currentStep + 1);
    setCurrentStep(next);
    saveToLocal(config, next, isDeployed);
  };

  const handlePrevStep = () => {
    const prev = Math.max(1, currentStep - 1);
    setCurrentStep(prev);
    saveToLocal(config, prev, isDeployed);
  };

  const handleDeploy = () => {
    setIsDeployed(true);
    saveToLocal(config, currentStep, true);
  };

  const handleReset = () => {
    if (confirm("Voulez-vous réinitialiser toutes vos configurations de restaurant ?")) {
      setConfig(INITIAL_CONFIG);
      setCurrentStep(1);
      setCompletedSteps([false, false, false, false]);
      setIsDeployed(false);
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(MASTER_STEP_KEY);
        localStorage.removeItem(DEPLOYED_KEY);
      } catch {
        // Safe wrap
      }
    }
  };

  // If already onboarded, render live SaaS dashboard dashboard view
  if (isDeployed) {
    return (
      <DashboardView
        config={config}
        onReset={handleReset}
        onEdit={() => setIsDeployed(false)}
      />
    );
  }

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
              <StepOverview
                config={config}
                onDeploy={handleDeploy}
                onPrev={handlePrevStep}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
