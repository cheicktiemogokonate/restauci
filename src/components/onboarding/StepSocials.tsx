import { Check, Link2, RefreshCw, Share2, Sparkles } from "lucide-react";
import React, { useState } from "react";
import { SocialLinks } from "./types";

interface StepSocialsProps {
  data: SocialLinks;
  updateData: (fields: Partial<SocialLinks>) => void;
  onNext: () => void;
  onPrev: () => void;
}

interface IntegrationTile {
  id: keyof SocialLinks;
  name: string;
  description: string;
  placeholder: string;
  iconBg: string;
  logoSvg: React.ReactNode;
}

export default function StepSocials({
  data,
  updateData,
  onNext,
  onPrev,
}: StepSocialsProps) {
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [connectedState, setConnectedState] = useState<Record<string, boolean>>(
    {
      whatsapp: !!data.whatsapp,
      facebook: !!data.facebook,
      instagram: !!data.instagram,
      website: !!data.website,
      googleBusiness: !!data.googleBusiness,
      tripadvisor: !!data.tripadvisor,
    },
  );

  const INTEGRATIONS: IntegrationTile[] = [
    {
      id: "instagram",
      name: "Instagram Food Profile",
      description:
        "Affichez vos plus belles assiettes et liez vos stories à votre menu.",
      placeholder: "https://instagram.com/votre_resto",
      iconBg: "bg-pink-50 text-pink-600 border-pink-100",
      logoSvg: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.091.246-4.577.014-.058.07-.123" />
          <circle
            cx="12"
            cy="12"
            r="5"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
          />
          <circle cx="18.5" cy="5.5" r="1.5" />
        </svg>
      ),
    },
    {
      id: "facebook",
      name: "Facebook Page",
      description:
        "Synchronisez vos posts et facilitez les réservations directes.",
      placeholder: "https://facebook.com/votre_resto",
      iconBg: "bg-blue-50 text-blue-600 border-blue-100",
      logoSvg: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    },
    {
      id: "googleBusiness",
      name: "Google Business Profile",
      description:
        "Améliorez votre visibilité locale sur les moteurs et cartes Google.",
      placeholder: "https://business.google.com/...",
      iconBg: "bg-red-50 text-red-650 border-red-100",
      logoSvg: (
        <svg className="w-5 h-5 fill-current text-red-500" viewBox="0 0 24 24">
          <path d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.579-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C17.955 2.192 15.34 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c6.478 0 10.793-4.537 10.793-10.985 0-.737-.08-1.302-.178-1.851h-10.615z" />
        </svg>
      ),
    },
    {
      id: "tripadvisor",
      name: "TripAdvisor",
      description:
        "Affiliez vos avis pour attirer une clientèle touristique premium.",
      placeholder: "https://tripadvisor.fr/Restaurant_Review...",
      iconBg: "bg-emerald-50 text-emerald-800 border-emerald-100",
      logoSvg: (
        <svg
          className="w-5 h-5 fill-current text-emerald-700"
          viewBox="0 0 24 24"
        >
          <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm-3.8 17.2c-1.546 0-2.8-1.254-2.8-2.8s1.254-2.8 2.8-2.8 2.8 1.254 2.8 2.8-1.254 2.8-2.8 2.8zm7.6 0c-1.547 0-2.8-1.254-2.8-2.8s1.253-2.8 2.8-2.8 2.8 1.254 2.8 2.8-1.253 2.8-2.8 2.8zm.2-9.6c.3 0 .5.2.5.5s-.2.5-.5.5-.5-.2-.5-.5.2-.5.5-.5z" />
        </svg>
      ),
    },
  ];

  const handleSimulateConnection = (
    id: keyof SocialLinks,
    placeholder: string,
  ) => {
    if (connectedState[id]) {
      // Disconnect
      setConnectedState((prev) => ({ ...prev, [id]: false }));
      updateData({ [id]: "" });
      return;
    }

    setConnectingId(id);
    // Simulate high-fidelity Stripe-like OAuth handshake
    setTimeout(() => {
      setConnectingId(null);
      setConnectedState((prev) => ({ ...prev, [id]: true }));
      // Assign mock URL
      updateData({ [id]: placeholder });
    }, 1500);
  };

  const handleInputChange = (id: keyof SocialLinks, val: string) => {
    updateData({ [id]: val });
    setConnectedState((prev) => ({ ...prev, [id]: val.trim().length > 0 }));
  };

  return (
    <div className="flex-1 max-w-4xl p-8 lg:p-12 overflow-y-auto">
      {/* Step Header */}
      <div className="mb-8">
        <div className="w-12 h-12 bg-emerald-50 text-brand-500 rounded-2xl flex items-center justify-center mb-4 ring-1 ring-emerald-100">
          <Share2 className="w-6 h-6" />
        </div>
        <span className="text-xs font-mono text-gray-400 font-semibold uppercase tracking-wider block">
          Étape 4/6
        </span>
        <h1 className="text-3xl font-bold font-display text-gray-900 tracking-tight leading-none mt-1">
          Réseaux sociaux
        </h1>
        <p className="text-sm text-gray-500 mt-2 font-sans">
          Liez les comptes officiels de votre restaurant pour activer les
          réservations sur vos canaux et enrichir votre page client autonome.
        </p>
      </div>

      <div className="space-y-6">
        {/* Connection grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {INTEGRATIONS.map((integ) => {
            const isConnecting = connectingId === integ.id;
            const isConnected = connectedState[integ.id];
            const currentVal = data[integ.id];

            return (
              <div
                key={integ.id}
                className={`bg-white border rounded-2xl p-5 shadow-xs transition-all duration-300 ${
                  isConnected
                    ? "border-brand-100 ring-2 ring-brand-50/50"
                    : "border-gray-100 hover:border-gray-250 hover:shadow-sm"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3.5">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center border ${integ.iconBg}`}
                    >
                      {integ.logoSvg}
                    </div>
                    <div>
                      <span className="text-sm font-bold text-gray-900 block font-display leading-tight">
                        {integ.name}
                      </span>
                      <p className="text-[11px] text-gray-500 mt-1 leading-relaxed max-w-50">
                        {integ.description}
                      </p>
                    </div>
                  </div>

                  {/* Connect Trigger */}
                  <button
                    type="button"
                    onClick={() =>
                      handleSimulateConnection(integ.id, integ.placeholder)
                    }
                    className={`px-3 py-1.5 text-[10px] font-bold rounded-lg uppercase flex items-center space-x-1 cursor-pointer transition-all ${
                      isConnected
                        ? "bg-red-50 text-red-600 border border-red-1.50 hover:bg-red-100"
                        : "bg-white border border-gray-200 hover:border-brand-500 hover:bg-brand-50/20 text-gray-700"
                    }`}
                  >
                    {isConnecting ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin text-brand-500" />
                        <span>Liaison...</span>
                      </>
                    ) : isConnected ? (
                      <>
                        <Check className="w-3 h-3 text-red-500 stroke-3" />
                        <span>Lier</span>
                      </>
                    ) : (
                      <span>Connecter</span>
                    )}
                  </button>
                </div>

                {/* Account input */}
                <div className="mt-4 pt-4 border-t border-gray-50">
                  <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1.5">
                    Lien / Profil public
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Link2 className="h-3.5 w-3.5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      className="w-full pl-9 pr-3 py-2 bg-gray-50/50 border border-gray-200 focus:border-brand-500 focus:bg-white rounded-lg text-xs font-sans outline-none text-gray-700"
                      placeholder={integ.placeholder}
                      value={currentVal || ""}
                      onChange={(e) =>
                        handleInputChange(integ.id, e.target.value)
                      }
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dynamic Connected Accounts Summary info */}
        <div className="p-4 bg-emerald-50/50 border border-brand-100/30 rounded-xl flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
            <span className="text-xs font-semibold text-gray-800">
              {Object.values(connectedState).filter(Boolean).length} comptes
              connectés au total.
            </span>
          </div>
          <span className="text-[10px] font-mono text-gray-400 uppercase">
            Mises à jour automatiques activées
          </span>
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
          onClick={onNext}
          className="px-6 py-2.5 bg-brand-green hover:bg-brand-600 text-white text-sm font-semibold rounded-xl inline-flex items-center space-x-2 shadow-md shadow-brand-500/10 cursor-pointer transition-all"
        >
          <span>Suivant</span>
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
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
