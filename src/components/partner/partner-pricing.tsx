"use client";

import { useState } from "react";
import { Building2, Check, Store } from "lucide-react";
import { MotionButton } from "@/components/ui/motion-button";
import { PARTNER_PLANS, type PartnerActivityType } from "@/lib/landing/partner-data";

export function PartnerPricing() {
  const [activity, setActivity] = useState<PartnerActivityType>("restaurant");

  return (
    <section id="tarifs" className="py-16 md:py-24 bg-transparent border-t border-[#dfe8e2] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="font-heading font-black text-3xl sm:text-4xl lg:text-5xl text-[#102d1f] tracking-tight mb-4">
            Un abonnement adapté à votre ambition.
          </h2>
          <p className="text-sm sm:text-base text-[#102d1f]/75 leading-relaxed">
            Pas de frais cachés. Choisissez l’offre qui correspond à votre volume d’activité.
          </p>

          {/* Activity Switch for Pricing */}
          <div className="mt-8 inline-flex items-center gap-2 p-1.5 rounded-2xl bg-[#edf5f0] border border-[#dfe8e2]">
            <button
              type="button"
              onClick={() => setActivity("restaurant")}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${activity === "restaurant"
                ? "bg-white text-[#0d3d28] shadow-xs"
                : "text-[#5e6e64] hover:text-[#0d3d28]"
                }`}
            >
              <Store className="size-4 text-[#087a50]" />
              Restaurants & Traiteurs
            </button>
            <button
              type="button"
              onClick={() => setActivity("residence")}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${activity === "residence"
                ? "bg-white text-[#0d3d28] shadow-xs"
                : "text-[#5e6e64] hover:text-[#0d3d28]"
                }`}
            >
              <Building2 className="size-4 text-[#087a50]" />
              Résidences & Meublés
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto">
          {PARTNER_PLANS.map((plan) => {
            const isPopular = plan.isPopular;
            const features = plan.features[activity];
            const limitText =
              activity === "restaurant"
                ? `${plan.limits.restaurant.categories} catégories • ${plan.limits.restaurant.dishes} plats max`
                : `${plan.limits.residence.residences} résidence${plan.limits.residence.residences === 1 ? "" : "s"
                } max`;

            return (
              <div
                key={plan.code}
                className={`rounded-2xl p-7 sm:p-9 flex flex-col justify-between transition-all duration-300 relative ${isPopular
                  ? "bg-gradient-to-b from-white via-[#f3fbf7] to-white border-2 border-[#087a50] shadow-xl lg:-translate-y-2"
                  : "bg-white border border-[#dfe8e2] shadow-xs hover:shadow-md"
                  }`}
              >
                {isPopular && (
                  <div className="absolute -top-3.5 right-6 px-3 py-0.5 text-[10px] font-black uppercase tracking-widest rounded-md bg-[#087a50] text-white">
                    Recommandé
                  </div>
                )}

                <div>
                  {/* Plan Name & Tagline */}
                  <div className="mb-4">
                    <h3 className="text-2xl font-black text-[#102d1f]">
                      {plan.name}
                    </h3>
                    <p className="text-xs text-[#5e6e64] mt-1.5 leading-relaxed">
                      {plan.tagline}
                    </p>
                  </div>

                  {/* Price Block */}
                  <div className="my-6 pb-6 border-b border-[#dfe8e2]">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-4xl sm:text-5xl font-black font-heading text-[#102d1f] tracking-tight">
                        {plan.annualPriceFcfa.toLocaleString("fr-FR")}
                      </span>
                      <span className="text-sm font-bold text-[#5e6e64]">
                        FCFA / an
                      </span>
                    </div>
                    <div className="mt-2 text-xs font-semibold text-[#087a50]">
                      Commission : {plan.commissionRatePercent} % sur les ventes
                    </div>
                  </div>

                  {/* Quota info */}
                  <div className="text-xs text-[#5e6e64] mb-6 flex items-center gap-2">
                    <span className="font-semibold text-[#102d1f]">Capacité :</span>
                    <span>{limitText}</span>
                  </div>

                  {/* Feature Checklist */}
                  <ul className="space-y-3 text-xs sm:text-sm text-[#102d1f]/85 mb-8">
                    {features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="size-5 rounded-full bg-[#e7f3ec] text-[#087a50] flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="size-3" strokeWidth={3} />
                        </span>
                        <span className="leading-snug">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA Button */}
                <div className="pt-2">
                  <MotionButton
                    href={`/login?activity=${activity}&plan=${plan.code}`}
                    label={plan.ctaLabel}
                    classes={isPopular ? "w-full" : "w-full bg-white/95 border-[#dfe8e2]"}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
