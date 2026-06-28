"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

const STATUTS = [
  { value: "tous", label: "Tous" },
  { value: "recue", label: "Reçue" },
  { value: "en_preparation", label: "En préparation" },
  { value: "prete", label: "Prête" },
  { value: "servie", label: "Servie" },
  { value: "annulee", label: "Annulée" },
];

export function CommandesAdminFilters({
  initialSearch,
  initialStatut,
}: {
  initialSearch?: string;
  initialStatut?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(initialSearch ?? "");

  const changeStatut = (statut: string) => {
    const params = new URLSearchParams(searchParams.toString());
    statut === "tous" ? params.delete("statut") : params.set("statut", statut);
    params.delete("page");
    router.push(`?${params.toString()}`);
  };

  const handleSearch = () => {
    const params = new URLSearchParams(searchParams.toString());
    searchValue ? params.set("search", searchValue) : params.delete("search");
    params.delete("page");
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex flex-col xl:flex-row gap-3 xl:items-center">
      {/* Tabs statut */}
      <div className="flex items-center gap-1.5 bg-gray-100/80 p-1 rounded-xl flex-wrap">
        {STATUTS.map((tab) => {
          const isActive = (initialStatut ?? "tous") === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => changeStatut(tab.value)}
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                isActive
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Recherche */}
      <div className="flex gap-2 xl:ml-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="N° commande ou client..."
            className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-white shadow-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 w-56"
          />
        </div>
        <button
          type="button"
          onClick={handleSearch}
          className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors shrink-0"
        >
          Chercher
        </button>
      </div>
    </div>
  );
}
