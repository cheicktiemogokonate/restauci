"use client";

import { useState, useTransition } from "react";
import { clientApi } from "@/lib/client-app/api-client";

interface Adresse {
  adresse: string;
  lat:     number;
  lng:     number;
}

interface AdresseLivraisonPickerProps {
  value:    Adresse | null;
  onChange: (adresse: Adresse | null) => void;
}

export function AdresseLivraisonPicker({ value, onChange }: AdresseLivraisonPickerProps) {
  const [saisie, setSaisie] = useState(value?.adresse ?? "");
  const [error, setError]   = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleGeocoder = () => {
    if (saisie.trim().length < 3) return;
    setError(null);

    startTransition(async () => {
      const result = await clientApi.get<{
        adresse: string; lat: number; lng: number;
      }>(`/geo/geocode?q=${encodeURIComponent(saisie)}`);

      if (result.success && result.data) {
        onChange(result.data);
        setSaisie(result.data.adresse);
      } else {
        setError(result.error ?? "Adresse introuvable");
        onChange(null);
      }
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <label className="text-sm font-semibold text-gray-900 block mb-2">
        Adresse de livraison
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleGeocoder()}
          placeholder="Ex: Cocody Riviera 3, Abidjan"
          className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
        />
        <button
          type="button"
          onClick={handleGeocoder}
          disabled={isPending}
          className="px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl disabled:opacity-50"
        >
          {isPending ? "..." : "Valider"}
        </button>
      </div>
      {value && (
        <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
          ✓ Adresse confirmée
        </p>
      )}
      {error && (
        <p className="text-xs text-red-600 mt-2">{error}</p>
      )}
    </div>
  );
}
