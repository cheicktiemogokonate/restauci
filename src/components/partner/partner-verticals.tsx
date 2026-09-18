"use client";

import {
  UtensilsCrossed,
  ShoppingBag,
  Bike,
  Clock,
  Sparkles,
  CalendarCheck,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { PARTNER_ACTIVITIES } from "./partner-data";
import { ScrambleButton } from "@/components/ui/cta-with-marquee";

export function PartnerVerticals() {
  const restaurant = PARTNER_ACTIVITIES.find((a) => a.id === "restaurant")!;
  const residence = PARTNER_ACTIVITIES.find((a) => a.id === "residence")!;

  const restaurantIcons = [UtensilsCrossed, ShoppingBag, Bike, Clock];
  const residenceIcons = [Sparkles, CalendarCheck, ShieldCheck, UserCheck];

  const handleCtaClick = () => {
    const el = document.getElementById("tarifs");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section id="activites" className="py-20 md:py-28 bg-transparent border-t border-[#dfe8e2]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-24 md:space-y-32">
        {/* Restaurants (Prompt 1 layout: Content Left, Cards Right) */}
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left Content */}
          <div className="space-y-6">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight text-[#102d1f]">
              {restaurant.title}
            </h2>
            <div className="space-y-2 text-[#5e6e64]">
              <p className="text-lg font-medium text-[#102d1f]/90">
                {restaurant.subtitle}
              </p>
              <p className="text-base leading-relaxed">
                {restaurant.description}
              </p>
            </div>
            <div className="pt-2">
              <ScrambleButton
                label="Découvrir l'offre Restaurant"
                onClick={handleCtaClick}
              />
            </div>
          </div>

          {/* Right Cards */}
          <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
            {restaurant.highlights.map((item, idx) => {
              const Icon = restaurantIcons[idx % restaurantIcons.length];
              return (
                <div
                  key={item.title}
                  className="p-6 rounded-2xl bg-white border border-[#dfe8e2] hover:border-[#087a50]/40 transition-colors shadow-xs"
                >
                  <div className="size-10 rounded-xl bg-[#edf5f0] text-[#087a50] flex items-center justify-center mb-4">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="font-bold text-base text-[#102d1f] mb-1.5">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#5e6e64] leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Residences (Prompt 2 Reverse layout: Cards Left, Content Right) */}
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left Cards */}
          <div className="grid sm:grid-cols-2 gap-4 sm:gap-5 order-2 lg:order-1">
            {residence.highlights.map((item, idx) => {
              const Icon = residenceIcons[idx % residenceIcons.length];
              return (
                <div
                  key={item.title}
                  className="p-6 rounded-2xl bg-white border border-[#dfe8e2] hover:border-[#087a50]/40 transition-colors shadow-xs"
                >
                  <div className="size-10 rounded-xl bg-[#edf5f0] text-[#087a50] flex items-center justify-center mb-4">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="font-bold text-base text-[#102d1f] mb-1.5">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#5e6e64] leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Right Content */}
          <div className="space-y-6 order-1 lg:order-2">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight text-[#102d1f]">
              {residence.title}
            </h2>
            <div className="space-y-2 text-[#5e6e64]">
              <p className="text-lg font-medium text-[#102d1f]/90">
                {residence.subtitle}
              </p>
              <p className="text-base leading-relaxed">
                {residence.description}
              </p>
            </div>
            <div className="pt-2">
              <ScrambleButton
                label="Découvrir l'offre Résidence"
                onClick={handleCtaClick}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
