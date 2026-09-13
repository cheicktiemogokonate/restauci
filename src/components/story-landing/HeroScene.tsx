"use client";

import { hero } from "./content";
import { Iphone } from "./vendor/iphone";
import { ScreenScaler } from "./vendor/ScreenScaler";
import { PhoneScreens } from "./mobile/PhoneScreens";
import { SafariWindow } from "./ProStage";

/**
 * Scène narrative : UNE scène pinned contenant Safari et l'iPhone du Hero
 * jusqu'au dashboard final (spec §5, §12) — le même iPhone devient la
 * séquence mobile, la même fenêtre Safari reçoit la demande.
 *
 * Les positions/rotations initiales sont posées par GSAP dans
 * NarrativeLanding (avant paint) ; le CSS ne gère que le layout.
 * Ciblage GSAP par attributs data-story-*.
 */
export function HeroScene({ reduced = false }: { reduced?: boolean }) {
  return (
    <section data-story-stage className="relative">
      <div
        data-story-screen
        className="relative h-screen overflow-hidden bg-[#F4F8F4]"
      >
        {/* Halos d'ambiance très discrets (§4) */}
        <div
          aria-hidden
          className="absolute -top-40 -left-40 size-[600px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(20,83,45,0.07) 0%, transparent 70%)",
          }}
        />
        <div
          aria-hidden
          className="absolute -right-40 -bottom-40 size-[600px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(20,83,45,0.06) 0%, transparent 70%)",
          }}
        />

        {/* Safari — léger tilt gauche, partiellement hors cadre */}
        <div
          data-story-safari
          className="absolute top-1/2 left-0 z-[1] w-[58vw] max-w-[1200px]"
        >
          <SafariWindow />
        </div>

        {/* iPhone — léger tilt droit, partiellement hors cadre.
            L'ombre n'apparaît qu'au premier plan (§5.8) via GSAP. */}
        <div data-story-iphone className="absolute top-1/2 right-0 z-[2] w-[21vw] max-w-[360px] min-w-[240px]">
          <div
            data-story-phone-shadow
            aria-hidden
            className="absolute -bottom-8 left-1/2 h-10 w-[86%] -translate-x-1/2 rounded-[100%] bg-black/25 blur-2xl"
            style={{ opacity: 0 }}
          />
          <Iphone>
            <ScreenScaler designWidth={389}>
              <PhoneScreens reduced={reduced} />
            </ScreenScaler>
          </Iphone>
        </div>

        {/* Voile de profondeur — s'atténue au scroll (§5) */}
        <div
          data-story-veil
          aria-hidden
          className="absolute inset-0 z-[3] bg-[#F6F9F6]/70"
        />

        {/* Promesse (§4) */}
        <div
          data-story-title
          className="relative z-[4] flex h-full flex-col items-center justify-center px-6 text-center"
        >
          <h1 className="text-5xl leading-[1.05] font-extrabold tracking-tight text-[#22312A] md:text-6xl lg:text-7xl">
            {hero.titleParts.map((part) => (
              <span
                key={part.text}
                className={
                  part.tone === "accent" ? "text-primary" : undefined
                }
              >
                {part.text}{" "}
              </span>
            ))}
          </h1>
          <p className="mt-5 max-w-md text-base text-[#5C6E63] md:text-lg">
            {hero.subtitle}
          </p>
        </div>
      </div>
    </section>
  );
}
