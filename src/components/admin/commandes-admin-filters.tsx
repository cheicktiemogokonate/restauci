"use client";

import { Input } from "@/components/motion/input";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function CommandesAdminFilters({
  initialSearch,
  initialStatut,
  initialRestaurant,
  initialDateDebut,
  initialDateFin,
  initialSignal,
}: {
  initialSearch?: string;
  initialStatut?: string;
  initialRestaurant?: string;
  initialDateDebut?: string;
  initialDateFin?: string;
  initialSignal?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(initialSearch ?? "");
  const [restaurantValue, setRestaurantValue] = useState(
    initialRestaurant ?? "",
  );
  const [dateDebut, setDateDebut] = useState(initialDateDebut ?? "");
  const [dateFin, setDateFin] = useState(initialDateFin ?? "");

  const handleFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    const setOrDelete = (key: string, value: string) => {
      const normalizedValue = value.trim();
      if (normalizedValue) {
        params.set(key, normalizedValue);
      } else {
        params.delete(key);
      }
    };
    setOrDelete("search", searchValue);
    setOrDelete("restaurant", restaurantValue);
    setOrDelete("dateDebut", dateDebut);
    setOrDelete("dateFin", dateFin);
    params.delete("page");
    router.push(`?${params.toString()}`);
  };

  const resetFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    [
      "search",
      "restaurant",
      "dateDebut",
      "dateFin",
      "statut",
      "signal",
    ].forEach((key) => params.delete(key));
    params.delete("page");
    setSearchValue("");
    setRestaurantValue("");
    setDateDebut("");
    setDateFin("");
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col xl:flex-row gap-3 xl:items-center">
        {/* <Tabs value={initialStatut ?? "tous"} onValueChange={changeStatut} variant="underline" className="max-w-full overflow-x-auto scrollbar-hide">
          <TabsList className="h-11 min-w-max gap-0">
            {STATUTS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="h-11 px-3.5 text-sm" indicatorClassName="h-0.5 bg-emerald-600">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs> */}

        {/* <div className="flex w-full gap-2 xl:ml-auto xl:w-auto">
          <div className="relative min-w-0 flex-1 xl:w-64">
            <Input
              type="text"
              aria-label="Rechercher une commande"
              value={searchValue}
              onChange={setSearchValue}
              onKeyDown={(e) => e.key === "Enter" && handleFilters()}
              placeholder="N° commande ou client..."
              leftIcon={<Search />}
              className="w-full"
              classNames={{ field: "h-10 rounded-xl bg-white" }}
            />
          </div>
          <Button type="button" onClick={handleFilters} className="h-auto">
            Chercher
          </Button>
        </div> */}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="space-y-1 sm:w-56">
          <label
            htmlFor="restaurant"
            className="text-xs font-medium text-gray-600"
          >
            Restaurant
          </label>
          <Input
            id="restaurant"
            value={restaurantValue}
            onChange={setRestaurantValue}
            onKeyDown={(e) => e.key === "Enter" && handleFilters()}
            placeholder="Nom du restaurant"
            classNames={{ field: "h-10 rounded-xl bg-white" }}
          />
        </div>
        <div className="space-y-1">
          <label
            htmlFor="dateDebut"
            className="text-xs font-medium text-gray-600 mr-2"
          >
            Du
          </label>
          <DatePicker
            id="dateDebut"
            date={dateDebut ? new Date(`${dateDebut}T00:00:00`) : undefined}
            setDate={(date) =>
              setDateDebut(date ? format(date, "yyyy-MM-dd") : "")
            }
            className="w-full sm:w-44 h-10"
          />
        </div>
        <div className="space-y-1">
          <label
            htmlFor="dateFin"
            className="text-xs font-medium text-gray-600 mr-2"
          >
            Au
          </label>
          <DatePicker
            id="dateFin"
            date={dateFin ? new Date(`${dateFin}T00:00:00`) : undefined}
            setDate={(date) =>
              setDateFin(date ? format(date, "yyyy-MM-dd") : "")
            }
            className="w-full sm:w-44 h-10"
          />
        </div>

        <Button type="button" className="h-10" onClick={handleFilters}>
          Appliquer
        </Button>
        {(initialSearch ||
          initialStatut ||
          initialRestaurant ||
          initialDateDebut ||
          initialDateFin ||
          initialSignal) && (
          <Button type="button" variant="ghost" onClick={resetFilters}>
            Réinitialiser
          </Button>
        )}
      </div>
    </div>
  );
}
