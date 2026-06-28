"use client";

import type { GeolocationStatus } from "@/lib/client-app/hooks/use-geolocation";
import { useAuthStore } from "@/lib/client-app/stores/auth-store";
import Link from "next/link";

interface ClientTopBarProps {
  geoStatus: GeolocationStatus;
  onDemanderGeolocation: () => void;
  nombreResultats: number;
  isLoading: boolean;
  // NOUVEAU :
  search: string;
  onSearchChange: (value: string) => void;
  cuisine: string | null;
  onCuisineChange: (value: string | null) => void;
}

export function ClientTopBar({
  geoStatus,
  onDemanderGeolocation,
  nombreResultats,
  isLoading,
  search,
  onSearchChange,
  cuisine,
  onCuisineChange,
}: ClientTopBarProps) {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="absolute top-0 left-0 right-0 z-20 p-4 pointer-events-none">
      <div className="flex items-center gap-2 pointer-events-auto">
        {/* Barre de recherche */}
        <div className="flex-1 bg-white rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3">
          <svg
            className="w-5 h-5 text-gray-400 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher un restaurant, un plat..."
            className="flex-1 text-sm focus:outline-none placeholder:text-gray-400"
          />
        </div>

        {/* Bouton localisation */}
        <button
          type="button"
          onClick={onDemanderGeolocation}
          className="w-12 h-12 bg-white rounded-2xl shadow-lg flex items-center justify-center shrink-0"
          aria-label="Me localiser"
        >
          {geoStatus === "demande" ? (
            <div className="w-4 h-4 border-2 border-gray-300 border-t-green-700 rounded-full animate-spin" />
          ) : (
            <svg
              className="w-5 h-5 text-green-700"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
              />
            </svg>
          )}
        </button>

        {/* Profil / connexion */}
        <Link
          href="/profil"
          className="w-12 h-12 bg-white rounded-2xl shadow-lg flex items-center justify-center shrink-0"
        >
          {user ? (
            <div className="w-8 h-8 rounded-full bg-green-700 flex items-center justify-center">
              <span className="text-xs font-bold text-white">
                {user.nom
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </span>
            </div>
          ) : (
            <svg
              className="w-5 h-5 text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
              />
            </svg>
          )}
        </Link>
      </div>

      {/* Indicateur de resultats */}
      {!isLoading && (
        <div className="mt-2 inline-block bg-white/90 backdrop-blur-sm px-3 py-1.5 pointer-events-auto">
          <span className="text-xs font-medium text-gray-600">
            {nombreResultats} restaurant{nombreResultats !== 1 ? "s" : ""} a
            proximite
          </span>
        </div>
      )}

      {/* Filtres cuisine */}
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1 pointer-events-auto scrollbar-hide">
        {[
          "Tout",
          "Africaine",
          "Pizza",
          "Fast food",
          "Pâtisserie",
          "Boissons",
        ].map((c) => {
          const value = c === "Tout" ? null : c;
          const isActive = cuisine === value;
          return (
            <button
              key={c}
              type="button"
              onClick={() => onCuisineChange(value)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                isActive
                  ? "bg-gray-900 text-white"
                  : "bg-white/90 text-gray-600"
              }`}
            >
              {c}
            </button>
          );
        })}
      </div>

      {geoStatus === "refusee" && (
        <div className="mt-2 inline-block bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 pointer-events-auto">
          <span className="text-xs text-amber-700">
            Localisation refusee - affichage centre sur Abidjan
          </span>
        </div>
      )}
    </div>
  );
}
