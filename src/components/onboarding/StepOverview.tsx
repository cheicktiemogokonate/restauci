import Image from "next/image";
import {
  ArrowRight,
  Eye,
  Mail,
  Phone,
  LoaderCircle,
  ShieldCheck,
  Utensils,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  getEstablishmentCategoryLabel,
  getEstablishmentTypeLabel,
  getServiceTypeLabel,
} from "@/lib/onboarding/settings";
import { RestaurantConfig } from "./types";
import { Button } from "../ui/button";

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
  isDeploying = false,
}: StepOverviewProps) {
  const establishmentCategory =
    getEstablishmentCategoryLabel(config.settings.category) ??
    "Non renseignée";
  const establishmentType =
    getEstablishmentTypeLabel(config.settings.establishmentType) ??
    "Non renseigné";
  const serviceLabels = config.settings.serviceTypes
    .map(getServiceTypeLabel)
    .filter((label) => label !== null);

  return (
    <div className="flex-1 max-w-4xl p-8 lg:p-12 overflow-y-auto font-sans">
      {isDeploying ? (
        <div className="min-h-125 flex flex-col items-center justify-center bg-white border border-gray-100 rounded-3xl p-8 shadow-xl text-center">
          <LoaderCircle className="mb-8 h-16 w-16 animate-spin text-brand-500" />

          <span className="text-[10px] font-bold font-mono text-emerald-600 uppercase tracking-widest block mb-1">
            Enregistrement en cours
          </span>
          <h2 className="text-2xl font-bold font-display text-gray-950 tracking-tight">
            Création de votre restaurant...
          </h2>

          <p className="text-xs text-gray-400 mt-6 max-w-xs leading-relaxed">
            Votre établissement, ses horaires et sa carte sont enregistrés de
            façon atomique. Vous serez redirigé vers le tableau de bord.
          </p>
        </div>
      ) : (
        <>
          {/* Step Header */}
          <div className="mb-8">

            <span className="text-xs font-mono text-gray-400 font-semibold uppercase tracking-wider block">
              Étape 5/5
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
                  <Image
                    src={config.general.bannerUrl}
                    alt="Restau Banner"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/10 to-transparent" />
                  <div className="absolute bottom-4 left-6 flex items-end space-x-4">
                    {/* Logo inside */}
                    <div className="w-16 h-16 bg-white rounded-xl p-1 shadow-md shrink-0 flex items-center justify-center overflow-hidden">
                      {config.general.logoUrl ? (
                        <Image
                          src={config.general.logoUrl}
                          alt="Logo preview"
                          referrerPolicy="no-referrer"
                          className="max-h-full max-w-full object-contain rounded-lg"
                          width={64}
                          height={64}
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
                        Établissement
                      </span>
                      <span className="text-gray-900 font-semibold">
                        {establishmentType}
                      </span>
                    </div>
                    <div className="flex items-start">
                      <span className="w-24 text-gray-400 font-medium shrink-0">
                        Sous-type
                      </span>
                      <span className="text-gray-900 font-semibold">
                        {establishmentCategory}
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
                        Services
                      </span>
                      <span className="text-gray-900 font-semibold">
                        {serviceLabels.join(", ") || "Non renseignés"}
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
                        className={`px-2 py-1 text-[10px] font-bold rounded-lg ${row.isOpen
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

            {config.menu.length > 0 ? (
              <section
                aria-labelledby="overview-menu-title"
                className="border-t border-gray-100 pt-7"
              >
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <h3
                      id="overview-menu-title"
                      className="flex items-center gap-2 text-xs font-bold tracking-wider text-gray-500 uppercase"
                    >
                      <Utensils
                        className="size-4 text-brand-600"
                        aria-hidden="true"
                      />
                      Premiers plats
                    </h3>
                    <p className="mt-1 text-[11px] text-gray-400">
                      Ces plats seront ajoutés à votre carte dès sa création.
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-brand-700">
                    {config.menu.length}
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {config.menu.map((item) => (
                    <article
                      key={item.id}
                      className="flex min-w-0 items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50/50 p-3"
                    >
                      <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-emerald-50">
                        {item.photoUrl ? (
                          <Image
                            src={item.photoUrl}
                            alt=""
                            fill
                            sizes="56px"
                            className="object-cover"
                          />
                        ) : (
                          <Utensils
                            className="absolute inset-0 m-auto size-4 text-brand-300"
                            aria-hidden="true"
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="truncate text-sm font-bold text-gray-900">
                          {item.name}
                        </h4>
                        <p className="truncate text-[11px] text-gray-500">
                          {item.category}
                        </p>
                        <p className="mt-1 text-xs font-bold text-brand-700">
                          {new Intl.NumberFormat("fr-FR").format(item.price)}{" "}
                          FCFA
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

          </div>

          {/* Buttons Block */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
            <Button
              onClick={onPrev}
              variant="outline"
              disabled={isDeploying}
            >
              <ChevronLeft />
              Précédent
            </Button>

            <Button
              onClick={onDeploy}
              disabled={isDeploying}
            >
              Créer le restaurant
              <ChevronRight />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
