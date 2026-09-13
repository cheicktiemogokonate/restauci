"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/motion/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/motion/select";
import type { MenuCategoryOptionDTO } from "@/modules/menu/contracts";
import { LoaderCircle, Search, SlidersHorizontal, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

interface MenuFiltersProps {
  categories: MenuCategoryOptionDTO[];
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
  currentQ = "",
  currentCategorie = "",
  currentDispo = "all",
}: MenuFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(currentQ);
  const [isNavigating, startTransition] = useTransition();

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
    startTransition(() => {
      router.replace(qs ? `?${qs}` : "/restaurateur/menu", { scroll: false });
    });
  };

  useEffect(() => {
    const normalizedQuery = query.trim();
    const nextSearch = normalizedQuery.length >= 3 ? normalizedQuery : null;
    const currentSearch = currentQ.trim() || null;

    // Les très courtes saisies sont trop ambiguës pour justifier une requête.
    // Si une recherche active repasse sous le seuil, on revient simplement à la carte complète.
    if (nextSearch === currentSearch) return;
    if (nextSearch === null && currentSearch === null) return;

    const timer = window.setTimeout(() => updateParams({ q: nextSearch }), 300);
    return () => window.clearTimeout(timer);
  }, [query, currentQ]);

  const clearFilters = () => {
    setQuery("");
    updateParams({ q: null, categorie: null, dispo: null });
  };

  const hasActiveFilters =
    Boolean(currentQ) || Boolean(currentCategorie) || currentDispo !== "all";

  return (
    <div className="mb-8 rounded-2xl border border-border/70 bg-muted/25 p-3 sm:p-4">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,19rem)_1fr] xl:items-center">
        <div className="flex w-full items-center gap-2">
          <div className="relative flex items-center w-full">
            <Input
              type="text"
              value={query}
              onChange={setQuery}
              placeholder="Rechercher un plat…"
              leftIcon={<Search />}
              className="w-full"
              classNames={{ field: "h-11 rounded-xl bg-background", input: "pr-10" }}
            />
            {isNavigating && <LoaderCircle className="absolute right-3 h-4 w-4 animate-spin text-muted-foreground" />}
          </div>

          {hasActiveFilters ? (
            <Button
              type="button"
              variant="outline"
              onClick={clearFilters}
              disabled={isNavigating}
              className="h-11 shrink-0 rounded-xl px-3"
            >
              <X className="h-4 w-4" />
              <span className="hidden sm:inline">Réinitialiser</span>
            </Button>
          ) : null}
        </div>

        <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-1 xl:justify-end xl:pb-0">
          <span className="hidden shrink-0 items-center gap-1.5 text-xs font-semibold text-muted-foreground 2xl:inline-flex"><SlidersHorizontal className="h-3.5 w-3.5" />Afficher</span>
          {dispoFilters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() =>
                updateParams({ dispo: filter.id === "all" ? null : filter.id })
              }
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors sm:px-4 sm:text-sm ${
                currentDispo === filter.id
                  ? "bg-brand-green text-white border-brand-green"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {filter.label}
            </button>
          ))}
          <Select
            value={currentCategorie}
            onValueChange={(value) =>
              updateParams({ categorie: value || null })
            }
            className="w-48 shrink-0"
          >
            <SelectTrigger className="h-9" ariaLabel="Filtrer par catégorie">
              <SelectValue placeholder="Toutes les catégories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Toutes les catégories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.nom}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
