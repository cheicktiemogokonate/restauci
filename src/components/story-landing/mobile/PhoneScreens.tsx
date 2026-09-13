"use client";

import { BatteryFull, Compass, Search, Signal, Wifi, Clock3, MapPin } from "lucide-react";
import { brandName } from "../content";
import { MobileMap } from "./MobileMap";
import { LocationSheet } from "./LocationSheet";
import { useStory } from "../animation-state";

/**
 * Écrans de l'iPhone narrative — interface volontairement générique (spec §6) :
 * aucun vocabulaire vertical (restaurant, résidence…), seulement la mécanique
 * découverte → sélection → demande.
 *
 * Home et Map restent montés ; l'orchestrateur GSAP fait le crossfade via
 * data-story-screen-home / data-story-screen-map.
 */
export function PhoneScreens({ reduced = false }: { reduced?: boolean }) {
  return (
    <div className="relative h-full w-full bg-[#F7FAF7]">
      <HomeScreen />
      <MapScreen reduced={reduced} />
    </div>
  );
}

function StatusBar() {
  return (
    <div className="flex items-center justify-between px-6 pt-3 pb-1 text-[11px] font-semibold text-[#22312A]">
      <span>9:41</span>
      <span className="flex items-center gap-1" aria-hidden>
        <Signal className="size-3" />
        <Wifi className="size-3" />
        <BatteryFull className="size-3.5" />
      </span>
    </div>
  );
}

function HomeScreen() {
  return (
    <div
      data-story-screen-home
      className="absolute inset-0 flex flex-col"
    >
      <StatusBar />
      <div className="px-5 pt-6">
        <p className="text-xs text-[#7A8A80]">Bonjour 👋</p>
        <h3 className="mt-1 text-xl font-extrabold text-[#22312A]">
          Autour de vous
        </h3>
        <div className="mt-4 flex items-center gap-2 rounded-full border border-[#E3EAE5] bg-white px-4 py-2.5 text-sm text-[#9AA9A0]">
          <Search className="size-4" aria-hidden />
          Rechercher…
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {["À la une", "Près de vous", "Nouveautés"].map((chip) => (
            <span
              key={chip}
              className="rounded-full bg-[#EAF3EB] px-3 py-1.5 text-xs font-medium text-[#3E5A48]"
            >
              {chip}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-1 flex-col gap-3 px-5 pb-6">
        {[
          { icon: Compass, title: "Explorer la carte", sub: "Tout ce qui est disponible près de vous" },
          { icon: Clock3, title: "Vos demandes", sub: "Suivi en temps réel, de l'envoi à la fin" },
          { icon: MapPin, title: "Adresses enregistrées", sub: "Retrouvez vos endroits préférés" },
        ].map((card) => (
          <div
            key={card.title}
            className="flex items-center gap-3 rounded-2xl border border-[#E9F0EA] bg-white px-4 py-3"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#EAF3EB]">
              <card.icon className="size-4 text-primary" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#22312A]">
                {card.title}
              </p>
              <p className="truncate text-xs text-[#7A8A80]">{card.sub}</p>
            </div>
          </div>
        ))}
        <p className="mt-auto text-center text-[10px] text-[#AAB8AF]">
          {brandName}
        </p>
      </div>
    </div>
  );
}

function MapScreen({ reduced }: { reduced: boolean }) {
  const markerSelected = useStory((s) => s.markerSelected);
  const sheet = useStory((s) => s.sheet);
  // La carte s'estompe quand le sheet devient haut (§9).
  const faded = sheet === "extended";

  return (
    <div data-story-screen-map className="absolute inset-0 opacity-0">
      <MobileMap selected={markerSelected} faded={faded} />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-[#F7FAF7]/90 to-transparent pt-3 pb-8">
        <StatusBar />
      </div>
      <LocationSheet reduced={reduced} />
    </div>
  );
}
