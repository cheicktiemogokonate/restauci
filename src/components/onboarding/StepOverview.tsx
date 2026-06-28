import {
  ArrowRight,
  CheckCircle,
  Eye,
  Mail,
  Phone,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { RestaurantConfig } from "./types";

interface StepOverviewProps {
  config: RestaurantConfig;
  onDeploy: () => void;
  onPrev: () => void;
  isDeploying?: boolean;
}

export default function StepOverview({
  config,
  onDeploy,
  onPrev,
}: StepOverviewProps) {
  const [deploying, setDeploying] = useState(false);
  const [deployStep, setDeployStep] = useState(0);

  const deploymentSteps = [
    "Initialisation du conteneur sécurisé...",
    "Provisionnement de la base de données PostgreSQL...",
    "Création du sous-domaine https://restauci.mesh/...",
    "Génération du menu numérique responsive...",
    "Déploiement finalisé avec succès !",
  ];

  const handleLaunchDeployment = () => {
    setDeploying(true);
    setDeployStep(0);

    // Dynamic step increments
    const interval = setInterval(() => {
      setDeployStep((prev) => {
        if (prev >= deploymentSteps.length - 1) {
          clearInterval(interval);
          setTimeout(() => {
            onDeploy(); // Final transition to SaaS Live Dashboard
          }, 1000);
          return prev;
        }
        return prev + 1;
      });
    }, 1200);
  };

  return (
    <div className="flex-1 max-w-4xl p-8 lg:p-12 overflow-y-auto font-sans">
      {/* Deploying Progress state */}
      {deploying ? (
        <div className="min-h-125 flex flex-col items-center justify-center bg-white border border-gray-100 rounded-3xl p-8 shadow-xl text-center">
          <div className="relative w-24 h-24 mb-8 flex items-center justify-center">
            {/* Spinning ring */}
            <div className="absolute inset-0 rounded-full border-4 border-emerald-50 border-t-brand-500 animate-spin" />

            <svg
              className="w-10 h-10 text-brand-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M6 18V20h12v-2" />
              <path d="M5 10c0-2.3 1.5-4 4-4 1.2 0 2 .5 2.5 1 .5-.5 1.3-1 2.5-1 2.5 0 4 1.7 4 4 0 1-.2 1.5-1 2.2V16H5v-3.8c-.8-.7-1-1.2-1-2.2Z" />
            </svg>
          </div>

          <span className="text-[10px] font-bold font-mono text-emerald-600 uppercase tracking-widest block mb-1">
            Déploiement en cours
          </span>
          <h2 className="text-2xl font-bold font-display text-gray-950 tracking-tight">
            Création de votre restaurant...
          </h2>

          <div className="max-w-md w-full mt-8 bg-gray-50 border border-gray-100 rounded-2xl p-6 relative overflow-hidden">
            <div className="space-y-4">
              {deploymentSteps.map((stepMessage, idx) => {
                const isCurrent = idx === deployStep;
                const isPrevious = idx < deployStep;
                return (
                  <div
                    key={idx}
                    className={`flex items-center text-left text-xs font-medium space-x-3 transition-opacity duration-300 ${
                      isCurrent
                        ? "opacity-100"
                        : isPrevious
                          ? "opacity-40"
                          : "opacity-10"
                    }`}
                  >
                    {isPrevious ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : isCurrent ? (
                      <RefreshCw className="w-4 h-4 text-brand-500 animate-spin shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-gray-200 shrink-0" />
                    )}
                    <span
                      className={
                        isCurrent
                          ? "text-gray-900 font-semibold"
                          : "text-gray-600"
                      }
                    >
                      {stepMessage}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Static Progress Bar */}
            <div className="mt-8 h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-500 rounded-full transition-all duration-1000"
                style={{
                  width: `${((deployStep + 1) / deploymentSteps.length) * 100}%`,
                }}
              />
            </div>
          </div>

          <p className="text-xs text-gray-400 mt-6 max-w-xs leading-relaxed">
            Veuillez ne pas quitter ou recharger cette page. Vos configurations
            de base sont en cours de sauvegarde.
          </p>
        </div>
      ) : (
        <>
          {/* Step Header */}
          <div className="mb-8">
            <div className="w-12 h-12 bg-emerald-50 text-brand-500 rounded-2xl flex items-center justify-center mb-4 ring-1 ring-emerald-100">
              <Eye className="w-6 h-6" />
            </div>
            <span className="text-xs font-mono text-gray-400 font-semibold uppercase tracking-wider block">
              Étape 4/4
            </span>
            <h1 className="text-3xl font-bold font-display text-gray-900 tracking-tight leading-none mt-1">
              Aperçu de la configuration
            </h1>
            <p className="text-sm text-gray-500 mt-2">
              Vérifiez attentivement les informations renseignées. Une fois
              confirmé, votre tableau de bord SaaS sera entièrement prêt.
            </p>
          </div>

          <div className="space-y-8 bg-white border border-gray-100 rounded-3xl p-6 lg:p-8 shadow-sm">
            {/* Visual Header Identity Card */}
            <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-xs">
              {config.general.bannerUrl ? (
                <div className="h-44 w-full relative">
                  <img
                    src={config.general.bannerUrl}
                    alt="Restau Banner"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/10 to-transparent" />
                  <div className="absolute bottom-4 left-6 flex items-end space-x-4">
                    {/* Logo inside */}
                    <div className="w-16 h-16 bg-white rounded-xl p-1 shadow-md shrink-0 flex items-center justify-center overflow-hidden">
                      {config.general.logoUrl ? (
                        <img
                          src={config.general.logoUrl}
                          alt="Logo preview"
                          referrerPolicy="no-referrer"
                          className="max-h-full max-w-full object-contain rounded-lg"
                        />
                      ) : (
                        <svg
                          className="w-8 h-8 text-brand-500"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <polyline points="20 12 20 22 4 22 4 12" />
                          <rect x="2" y="7" width="20" height="5" />
                          <line x1="12" y1="22" x2="12" y2="7" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white font-display">
                        {config.general.name || "Mon Restaurant"}
                      </h2>
                      <span className="text-[10px] font-semibold text-emerald-300 uppercase font-mono tracking-wider">
                        Prêt pour le déploiement
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-gray-50 text-center">
                  <span className="text-sm text-gray-400">
                    Aucun visuel de couverture configuré.
                  </span>
                </div>
              )}

              {/* General details */}
              <div className="p-5 bg-white border-t border-gray-50">
                <p className="text-xs text-gray-600 leading-relaxed max-w-2xl italic font-sans">
                  {config.general.description || "Aucune description fournie"}
                </p>
              </div>
            </div>

            {/* Quick Grid columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column: Address & Contact */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 font-display">
                    Localisation & Adresse
                  </h3>
                  <div className="space-y-2 text-xs font-sans">
                    <div className="flex items-start">
                      <span className="w-24 text-gray-400 font-medium shrink-0">
                        Pays
                      </span>
                      <span className="text-gray-900 font-semibold">
                        {config.address.country}
                      </span>
                    </div>
                    <div className="flex items-start">
                      <span className="w-24 text-gray-400 font-medium shrink-0">
                        Commune
                      </span>
                      <span className="text-gray-900 font-semibold">
                        {config.address.commune} (
                        {config.address.quarter || "N/A"})
                      </span>
                    </div>
                    <div className="flex items-start">
                      <span className="w-24 text-gray-400 font-medium shrink-0">
                        Adresse
                      </span>
                      <span className="text-gray-900 leading-normal font-semibold">
                        {config.address.fullAddress}
                      </span>
                    </div>
                    <div className="flex items-start">
                      <span className="w-24 text-gray-400 font-medium shrink-0">
                        Coordonnées
                      </span>
                      <span className="text-gray-900 font-mono text-[11px]">
                        Lat: {config.address.latitude.toFixed(4)} • Lng:{" "}
                        {config.address.longitude.toFixed(4)}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 font-display">
                    Coordonnées Directes
                  </h3>
                  <div className="space-y-2 text-xs font-sans">
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 text-gray-400 mr-2.5" />
                      <span className="text-gray-900 font-semibold">
                        {config.address.phone || "Non renseigné"}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Mail className="w-4 h-4 text-gray-400 mr-2.5" />
                      <span className="text-gray-900 font-semibold">
                        {config.address.email || "Non renseigné"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Settings & Schedules */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 font-display">
                    Modèle d&apos;établissement
                  </h3>
                  <div className="space-y-2 text-xs font-sans">
                    <div className="flex items-start">
                      <span className="w-24 text-gray-400 font-medium shrink-0">
                        Catégorie
                      </span>
                      <span className="text-gray-900 font-semibold uppercase">
                        {config.settings.category || "Bistrot"}
                      </span>
                    </div>
                    <div className="flex items-start">
                      <span className="w-24 text-gray-400 font-medium shrink-0">
                        Devise
                      </span>
                      <span className="text-gray-900 font-semibold font-mono">
                        {config.settings.currency}
                      </span>
                    </div>
                    <div className="flex items-start">
                      <span className="w-24 text-gray-400 font-medium shrink-0">
                        Structure TVA
                      </span>
                      <span className="text-gray-900 font-semibold font-mono">
                        {config.settings.taxRate}%
                      </span>
                    </div>
                    <div className="flex items-start">
                      <span className="w-24 text-gray-400 font-medium shrink-0">
                        Services
                      </span>
                      <span className="text-gray-900 font-semibold">
                        {config.settings.serviceTypes
                          .join(", ")
                          .toUpperCase() || "Sur place"}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 font-display">
                    Horaires d&apos;ouverture
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {config.schedule.map((row) => (
                      <span
                        key={row.day}
                        className={`px-2 py-1 text-[10px] font-bold rounded-lg ${
                          row.isOpen
                            ? "bg-brand-50 text-brand-700 border border-brand-100"
                            : "bg-gray-50 text-gray-400 border border-gray-100"
                        }`}
                      >
                        {row.day.substring(0, 3)}.{" "}
                        {row.isOpen
                          ? `${row.openTime} - ${row.closeTime}`
                          : "Fermé"}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Verification Security banner */}
            <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl flex items-center space-x-3 text-xs leading-relaxed">
              <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold font-display block">
                  Saisie Vérifiée & Conforme
                </span>
                <p className="text-[11px] text-emerald-700 font-sans mt-0.5">
                  RestauCI chiffre et sécurise les coordonnées de
                  géolocalisation pour un référencement conforme aux
                  réglementations de l&apos;UEMOA.
                </p>
              </div>
            </div>
          </div>

          {/* Buttons Block */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={onPrev}
              className="px-5 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl inline-flex items-center space-x-2 transition-all cursor-pointer"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              <span>Précédent</span>
            </button>

            <button
              type="button"
              onClick={handleLaunchDeployment}
              className="px-6 py-2.5 bg-brand-green hover:bg-brand-600 text-white text-sm font-bold rounded-xl inline-flex items-center space-x-2 shadow-lg shadow-brand-500/20 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Créer le restaurant</span>
              <ArrowRight className="w-4 h-4 text-white hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
