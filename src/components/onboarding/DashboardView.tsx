import {
  CheckCircle,
  Clock,
  Edit3,
  Globe,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { RestaurantConfig } from "./types";

interface DashboardViewProps {
  config: RestaurantConfig;
  onReset: () => void;
  onEdit: () => void;
}

export default function DashboardView({
  config,
  onReset,
  onEdit,
}: DashboardViewProps) {
  return (
    <div className="flex-1 bg-gray-50/50 min-h-screen px-4 py-8 lg:py-12 flex flex-col items-center justify-center font-sans antialiased">
      {/* Container Card */}
      <div className="w-full max-w-4xl bg-white border border-gray-100/80 rounded-3xl shadow-xs overflow-hidden">
        {/* Banner with Logo */}
        <div className="relative h-48 w-full bg-linear-to-r from-brand-500 to-brand-600 overflow-hidden">
          {config.general.bannerUrl ? (
            <img
              src={config.general.bannerUrl}
              alt="Restaurant banner"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover opacity-90"
            />
          ) : (
            <div className="w-full h-full opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] bg-size-[16px_16px]" />
          )}
          <div className="absolute inset-0 bg-linear-to-t from-gray-950/60 via-gray-950/20 to-transparent" />

          {/* Logo & Basic Info */}
          <div className="absolute bottom-6 left-6 right-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 bg-white rounded-2xl p-1 shadow-md shrink-0 flex items-center justify-center overflow-hidden border border-gray-100">
                {config.general.logoUrl ? (
                  <img
                    src={config.general.logoUrl}
                    alt="Logo"
                    referrerPolicy="no-referrer"
                    className="max-h-full max-w-full object-contain rounded-xl"
                  />
                ) : (
                  <span className="text-2xl font-black text-brand-500 font-display">
                    {(config.general.name || "R").substring(0, 1).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="text-white">
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl md:text-2xl font-extrabold font-display tracking-tight">
                    {config.general.name || "L'Atelier Gourmet"}
                  </h1>
                </div>
                <p className="text-xs text-gray-200/95 font-medium mt-1 inline-flex items-center gap-1.5 uppercase tracking-wider font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Configuration Enregistrée avec Succès
                </p>
              </div>
            </div>

            {/* Quick action buttons in cover */}
            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={onEdit}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 hover:border-white/30 text-white rounded-xl text-xs font-bold inline-flex items-center space-x-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Modifier</span>
              </button>

              <button
                type="button"
                onClick={onReset}
                className="px-4 py-2 bg-red-500/15 hover:bg-red-500/20 backdrop-blur-md border border-red-500/25 hover:border-red-500/40 text-red-200 rounded-xl text-xs font-bold inline-flex items-center space-x-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Recommencer</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 md:p-8 space-y-8">
          {/* Welcome alert */}
          <div className="p-4 bg-emerald-50/40 text-emerald-800 border border-emerald-100/50 rounded-2xl flex items-start space-x-3.5 text-xs md:text-sm">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold font-display block text-emerald-950">
                Félicitations, l'onboarding est complété !
              </span>
              <p className="text-[12.5px] text-emerald-700 font-sans mt-0.5 leading-relaxed">
                Les coordonnées géographiques, les horaires d'ouverture et le
                profil numérique de{" "}
                <strong>{config.general.name || "votre établissement"}</strong>{" "}
                ont été figés et enregistrés sur votre terminal.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Column 1: General & Location */}
            <div className="space-y-6">
              {/* Profile details */}
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3.5 font-display flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-brand-500" />
                  Profil & Présentation
                </h3>
                <div className="bg-gray-50/50 border border-gray-100/70 p-4 rounded-2xl space-y-3.5 text-sm">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-gray-400 uppercase block leading-none">
                      Description
                    </span>
                    <p className="text-xs text-gray-600 font-sans mt-1 leading-relaxed italic">
                      {config.general.description ||
                        "Aucune description fournie"}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2.5 border-t border-gray-100/70 text-xs">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-gray-400 uppercase block">
                        Catégorie
                      </span>
                      <span className="text-gray-900 font-semibold uppercase font-display mt-0.5 block">
                        {config.settings.category || "Bistrot"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono font-bold text-gray-400 uppercase block">
                        Monnaie & TVA
                      </span>
                      <span className="text-gray-900 font-mono font-semibold mt-0.5 block">
                        {config.settings.currency} (TVA{" "}
                        {config.settings.taxRate}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Location details */}
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3.5 font-display flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                  Adresse & Géolocalisation
                </h3>
                <div className="bg-gray-50/50 border border-gray-100/70 p-4 rounded-2xl space-y-3 text-xs leading-relaxed">
                  <div className="flex items-start">
                    <span className="w-20 text-gray-400 shrink-0 font-medium">
                      Zone
                    </span>
                    <span className="text-gray-800 font-semibold">
                      {config.address.commune}, {config.address.city} •{" "}
                      {config.address.country}
                    </span>
                  </div>
                  <div className="flex items-start">
                    <span className="w-20 text-gray-400 shrink-0 font-medium">
                      Adresse
                    </span>
                    <span className="text-gray-800 font-medium leading-normal">
                      {config.address.fullAddress}
                    </span>
                  </div>
                  <div className="flex items-start pt-2 border-t border-gray-100/70">
                    <span className="w-20 text-gray-400 shrink-0 font-medium">
                      Coordonnées
                    </span>
                    <span className="text-gray-900 font-mono font-bold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      LAT {config.address.latitude.toFixed(5)} • LNG{" "}
                      {config.address.longitude.toFixed(5)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2: Service Schedules & Contact info */}
            <div className="space-y-6">
              {/* Schedules */}
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3.5 font-display flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  Horaires d&apos;Ouverture
                </h3>
                <div className="bg-gray-50/50 border border-gray-100/70 p-4 rounded-2xl space-y-2">
                  {config.schedule.map((row) => (
                    <div
                      key={row.day}
                      className="flex justify-between items-center text-xs font-sans py-0.5"
                    >
                      <span className="text-gray-600 font-medium">
                        {row.day}
                      </span>
                      {row.isOpen ? (
                        <span className="text-emerald-700 font-mono font-semibold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md text-[10.5px]">
                          {row.openTime} - {row.closeTime}
                        </span>
                      ) : (
                        <span className="text-gray-400 font-mono bg-gray-100/80 border border-gray-200/50 px-2 py-0.5 rounded-md text-[10.5px]">
                          Fermé
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Verified Contact Details & Links */}
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3.5 font-display flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-brand-500" />
                  Contacts, Réseaux & Liens
                </h3>
                <div className="bg-gray-50/50 border border-gray-100/70 p-4 rounded-2xl space-y-2.5 text-xs font-sans">
                  {config.address.phone && (
                    <div className="flex items-center space-x-2 text-gray-700">
                      <Phone className="w-3.5 h-3.5 text-gray-450 shrink-0" />
                      <span className="font-semibold">
                        {config.address.phone}
                      </span>
                    </div>
                  )}
                  {config.address.email && (
                    <div className="flex items-center space-x-2 text-gray-700">
                      <Mail className="w-3.5 h-3.5 text-gray-450 shrink-0" />
                      <span className="font-semibold">
                        {config.address.email}
                      </span>
                    </div>
                  )}
                  {config.address.whatsapp && (
                    <div className="flex items-center space-x-2 text-emerald-700 font-semibold">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>WhatsApp : {config.address.whatsapp}</span>
                    </div>
                  )}

                  {/* Social lists directly mapped */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100/70">
                    {config.socials.instagram && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-linear-to-r from-purple-500/10 to-pink-500/10 text-pink-700 rounded-lg text-[10.5px] font-semibold border border-pink-100/50">
                        {/* <Instagram className="w-3 h-3" /> */}
                        <span>Instagram</span>
                      </span>
                    )}
                    {config.socials.facebook && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-[10.5px] font-semibold border border-blue-100/50">
                        {/* <Facebook className="w-3 h-3" /> */}
                        <span>Facebook</span>
                      </span>
                    )}
                    {config.socials.website && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-brand-50 text-brand-700 rounded-lg text-[10.5px] font-semibold border border-brand-100/50">
                        <Globe className="w-3 h-3" />
                        <span>Site Web</span>
                      </span>
                    )}
                    {!config.socials.instagram &&
                      !config.socials.facebook &&
                      !config.socials.website && (
                        <span className="text-gray-400 italic text-[11px]">
                          Aucun réseau social lié.
                        </span>
                      )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom helper info */}
          <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-400 gap-4">
            <span>
              RestauCI Onboarding Engine © 2026. Tous droits réservés.
            </span>
            <div className="flex items-center space-x-4">
              <button
                type="button"
                onClick={onEdit}
                className="text-brand-500 hover:text-brand-600 font-bold hover:underline cursor-pointer"
              >
                Ajuster les valeurs
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={onReset}
                className="text-red-500 hover:text-red-600 font-medium hover:underline cursor-pointer"
              >
                Tout réinitialiser
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
