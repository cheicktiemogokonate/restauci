import { Check, Clock, Eye, HelpCircle, MapPin, Store } from "lucide-react";

interface SidebarProps {
  currentStep: number;
  goToStep: (step: number) => void;
  completedSteps: boolean[];
}

export default function Sidebar({
  currentStep,
  goToStep,
  completedSteps,
}: SidebarProps) {
  const steps = [
    {
      number: 1,
      title: "Enseigne & Identité",
      description: "Nom de l'établissement, logo et style de cuisine.",
      icon: Store,
    },
    {
      number: 2,
      title: "Adresse & Contact GPS",
      description: "Géolocalisation d'Abidjan et contact client.",
      icon: MapPin,
    },
    {
      number: 3,
      title: "Heures de Service",
      description: "Jours d'ouverture et créneaux horaires.",
      icon: Clock,
    },
    {
      number: 4,
      title: "Lancement",
      description: "Aperçu de la fiche et déploiement cloud.",
      icon: Eye,
    },
  ];

  return (
    <aside className="w-full lg:w-96 lg:h-screen lg:sticky lg:top-0 bg-gray-50 border-b lg:border-b-0 lg:border-r border-gray-100 flex flex-col p-5 sm:p-6 lg:p-8 shrink-0 select-none overflow-y-auto">
      {/* Brand Logo - Matches screenshot perfectly */}
      <div className="flex items-center space-x-3 mb-4 lg:mb-10">
        <div className="w-10 h-10 bg-brand-green rounded-xl flex items-center justify-center shadow-sm shadow-brand-green/20">
          {/* Chef Hat SVG or Icon */}
          <svg
            className="w-6 h-6 text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 18V20h12v-2" />
            <path d="M5 10c0-2.3 1.5-4 4-4 1.2 0 2 .5 2.5 1 .5-.5 1.3-1 2.5-1 2.5 0 4 1.7 4 4 0 1-.2 1.5-1 2.2V16H5v-3.8c-.8-.7-1-1.2-1-2.2Z" />
          </svg>
        </div>
        <span className="text-2xl font-bold font-display text-gray-900 tracking-tight">
          Restau<span className="text-brand-green">CI</span>
        </span>
      </div>

      {/* Main Stepper Info - Hidden on mobile */}
      <div className="hidden lg:block mb-8">
        <h2 className="text-2xl font-bold font-display text-gray-900 tracking-tight leading-tight">
          Créer un restaurant
        </h2>
        <p className="text-sm text-gray-500 mt-2 font-sans">
          Suivez les étapes pour configurer votre restaurant dans notre système
          de gestion premium.
        </p>
      </div>

      {/* Mobile Active Step Indicator - Custom premium layout only on small screens */}
      {(() => {
        const activeStep =
          steps.find((s) => s.number === currentStep) || steps[0];
        return (
          <div className="lg:hidden flex items-center justify-between bg-white border border-gray-100 p-4 rounded-2xl shadow-xs mb-3">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-brand-green text-brand-500 rounded-xl flex items-center justify-center font-bold font-mono text-sm ring-1 ring-brand-100 shadow-xs">
                {currentStep}
              </div>
              <div>
                <span className="text-[10px] font-mono text-gray-400 font-bold uppercase tracking-wider block leading-none">
                  Section active
                </span>
                <span className="text-xs font-bold font-display text-gray-950 tracking-tight block mt-1">
                  {activeStep.title}
                </span>
              </div>
            </div>

            {/* Pagination / Progress tracking indicator */}
            <div className="flex items-center space-x-1.5 px-1">
              {steps.map((step) => (
                <div
                  key={step.number}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    currentStep === step.number
                      ? "w-4 bg-brand-500"
                      : completedSteps[step.number - 1]
                        ? "w-1.5 bg-emerald-500"
                        : "w-1.5 bg-gray-200"
                  }`}
                />
              ))}
            </div>
          </div>
        );
      })()}

      {/* Vertical Stepper List (Desktop Only) */}
      <div className="hidden lg:flex lg:flex-col lg:flex-1 lg:space-y-6 relative">
        {/* Connecting Vertical Bar */}
        <div className="absolute left-4.25 top-3.5 bottom-6 w-0.5 bg-gray-200 z-0" />

        {steps.map((step, idx) => {
          const isCompleted = completedSteps[step.number - 1];
          const isActive = currentStep === step.number;
          const StepIcon = step.icon;

          return (
            <div
              key={step.number}
              onClick={() => {
                // Allow browsing to previous steps or completed ones
                if (isCompleted || step.number <= currentStep) {
                  goToStep(step.number);
                }
              }}
              className={`relative z-10 flex items-center lg:items-start lg:space-x-4 cursor-pointer group transition-all duration-300 ${
                isActive
                  ? "opacity-100"
                  : isCompleted
                    ? "opacity-90 hover:opacity-100"
                    : "opacity-60 hover:opacity-85"
              }`}
            >
              {/* Step indicator circle */}
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 font-sans font-bold text-sm shrink-0 shadow-sm ${
                  isCompleted
                    ? "bg-brand-green text-white shadow-brand-green/20"
                    : isActive
                      ? "bg-white border-2 border-brand-green text-brand-green ring-4 ring-brand-green/20"
                      : "bg-white border-2 border-gray-200 text-gray-500"
                }`}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5 stroke-3" />
                ) : (
                  <span>{step.number}</span>
                )}
              </div>

              {/* Step details */}
              <div className="flex-1 pt-1">
                <span
                  className={`text-sm font-semibold block transition-colors duration-200 font-display ${
                    isActive ? "text-brand-500 font-bold" : "text-gray-900"
                  }`}
                >
                  {step.title}
                </span>

                {/* Responsive or hover description */}
                <p className="text-xs text-gray-500 mt-1 font-sans leading-relaxed">
                  {step.description}
                </p>
              </div>

              {/* Float right small status icon */}
              <div className="hidden lg:block pt-1.5 opacity-40 group-hover:opacity-75 transition-opacity">
                <StepIcon
                  className={`w-4 h-4 ${isActive ? "text-brand-500" : "text-gray-400"}`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Sidebar Footer - Hidden on mobile */}
      <div className="hidden lg:flex mt-8 pt-6 border-t border-gray-100 items-center justify-between text-xs text-gray-400 font-mono">
        <span className="flex items-center">
          <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
          Région: Abidjan, CI
        </span>
        <span className="hover:text-brand-500 cursor-pointer flex items-center gap-1 transition-colors">
          <HelpCircle className="w-3.5 h-3.5" />
          Assistance
        </span>
      </div>
    </aside>
  );
}
