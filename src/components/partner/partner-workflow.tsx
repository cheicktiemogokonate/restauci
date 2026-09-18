"use client";

import HowItWorks, { type Step } from "@/components/ui/how-it-works";
import { ONBOARDING_STEPS } from "./partner-data";

const workflowSteps: Step[] = ONBOARDING_STEPS.map((step, idx) => {
  const themes: Array<"emerald" | "blue" | "orange" | "purple"> = [
    "emerald",
    "blue",
    "orange",
    "purple",
    "emerald",
  ];
  return {
    title: step.title,
    description: step.desc,
    colorTheme: themes[idx % themes.length],
  };
});

export function PartnerWorkflow() {
  return (
    <section id="fonctionnement" className="py-16 md:py-24 bg-transparent border-t border-[#dfe8e2]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Caption */}
        <div className="text-center max-w-3xl mx-auto mb-4">
          <h2 className="font-heading font-extrabold text-3xl sm:text-4xl lg:text-5xl text-[#102d1f] tracking-tight mb-4">
            Comment rejoindre le réseau Toutci ?
          </h2>
          <p className="text-sm sm:text-base text-[#102d1f]/70 leading-relaxed">
            Un parcours en 5 étapes pour valider votre dossier et lancer vos ventes en toute sécurité.
          </p>
        </div>

        {/* Pinned notes roadmap timeline with animated path */}
        <HowItWorks features={workflowSteps} />
      </div>
    </section>
  );
}
