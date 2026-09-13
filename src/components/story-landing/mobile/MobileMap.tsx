"use client";

import { MapPin } from "lucide-react";
import { mapMarkers } from "../story-data";
import { cn } from "@/shared/ui/cn";

export interface MobileMapProps {
  /** Marqueur sélectionné (true après le battement markerSelect). */
  selected: boolean;
  /** Le fond s'estompe quand le bottom sheet devient plein écran (§9). */
  faded: boolean;
}

/**
 * Carte mobile : fond SVG statique + marqueurs DOM positionnés en absolute
 * et animables individuellement (spec §7 — aucun moteur cartographique).
 */
export function MobileMap({ selected, faded }: MobileMapProps) {
  return (
    <div
      className="absolute inset-0 transition-opacity duration-500"
      style={{
        backgroundImage: "url(/story/map.svg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        opacity: faded ? 0.25 : 1,
      }}
      data-story-map
      aria-hidden
    >
      {mapMarkers.map((marker) => {
        const isSelected = "selected" in marker && marker.selected;
        return (
          <span
            key={marker.id}
            data-story-marker={marker.id}
            className="absolute -translate-x-1/2 -translate-y-full"
            style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
          >
            <span
              className={cn(
                "flex items-center justify-center rounded-full border-2 border-white transition-all duration-300",
                isSelected
                  ? "h-7 w-7 bg-primary shadow-md"
                  : "h-5 w-5 bg-white/85",
              )}
              style={isSelected && selected ? { transform: "scale(1.15)" } : undefined}
            >
              <MapPin
                className={cn(
                  isSelected ? "h-4 w-4 text-white" : "h-3 w-3 text-[#8AA393]",
                )}
                aria-hidden
              />
            </span>
            {isSelected && selected ? (
              <span
                className="absolute inset-0 -z-10 animate-ping rounded-full bg-primary/30"
                aria-hidden
              />
            ) : null}
          </span>
        );
      })}
    </div>
  );
}
