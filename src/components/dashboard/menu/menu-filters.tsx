"use client";

import { Button } from "@/components/ui/button";
import type { Categorie } from "@/types";
import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

interface MenuFiltersProps {
  categories: Categorie[];
  totalPlats: number;
  currentQ?: string;
  currentCategorie?: string;
  currentDispo?: string;
}

const dispoFilters = [
  { id: "all", label: "Tous" },
  { id: "available", label: "Disponibles" },
  { id: "unavailable", label: "Indisponibles" },
] as const;

export default function MenuFilters({
  categories,
  totalPlats,
  currentQ = "",
  currentCategorie = "",
  currentDispo = "all",
}: MenuFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(currentQ);

  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(updates)) {
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }

    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `?${qs}` : "/restaurateur/menu");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ q: query.trim() || null });
  };

  const clearFilters = () => {
    setQuery("");
    router.push("/restaurateur/menu");
  };

  const hasActiveFilters =
    Boolean(currentQ) || Boolean(currentCategorie) || currentDispo !== "all";

  return (
    <div className="space-y-4 mb-8">
      <form
        onSubmit={handleSearch}
        className="flex flex-col sm:flex-row items-start sm:items-center gap-3"
      >
        <div className="flex-1 max-w-md w-full">
          <div className="relative flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un plat..."
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 placeholder:text-gray-400"
            />
          </div>
        </div>
        <Button
          type="submit"
          className="h-11 px-6 bg-brand-green hover:bg-brand-green/90 text-white rounded-xl font-semibold"
        >
          Rechercher
        </Button>
        {hasActiveFilters && (
          <Button
            type="button"
            variant="outline"
            onClick={clearFilters}
            className="h-11 px-4 rounded-xl"
          >
            <X className="w-4 h-4 mr-1.5" />
            Effacer
          </Button>
        )}
      </form>

      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {dispoFilters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() =>
                updateParams({ dispo: filter.id === "all" ? null : filter.id })
              }
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                currentDispo === filter.id
                  ? "bg-brand-green text-white border-brand-green"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 lg:ml-auto">
          <label
            htmlFor="categorie-filter"
            className="text-sm text-gray-500 shrink-0"
          >
            Catégorie
          </label>
          <select
            id="categorie-filter"
            value={currentCategorie}
            onChange={(e) =>
              updateParams({ categorie: e.target.value || null })
            }
            className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 min-w-45"
          >
            <option value="">Toutes les catégories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.nom}
              </option>
            ))}
          </select>

          <span className="text-sm text-gray-500">
            {totalPlats} plat{totalPlats !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
