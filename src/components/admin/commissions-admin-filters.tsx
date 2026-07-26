"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/motion/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/motion/select";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";

export function CommissionsAdminFilters({
  initialRestaurant,
  initialStatut,
  initialDateDebut,
  initialDateFin,
}: {
  initialRestaurant?: string;
  initialStatut?: string;
  initialDateDebut?: string;
  initialDateFin?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [restaurant, setRestaurant] = useState(initialRestaurant ?? "");
  const [statut, setStatut] = useState(initialStatut ?? "tous");
  const [dateDebut, setDateDebut] = useState(initialDateDebut ?? "");
  const [dateFin, setDateFin] = useState(initialDateFin ?? "");

  const apply = () => {
    const params = new URLSearchParams(searchParams.toString());
    const setOrDelete = (key: string, value: string) => {
      if (value.trim()) params.set(key, value.trim());
      else params.delete(key);
    };
    setOrDelete("restaurant", restaurant);
    if (statut === "tous") params.delete("statut");
    else params.set("statut", statut);
    setOrDelete("dateDebut", dateDebut);
    setOrDelete("dateFin", dateFin);
    params.delete("page");
    router.push(`?${params.toString()}`);
  };

  const reset = () => {
    const params = new URLSearchParams(searchParams.toString());
    ["restaurant", "statut", "dateDebut", "dateFin", "page"].forEach((key) => params.delete(key));
    setRestaurant("");
    setStatut("tous");
    setDateDebut("");
    setDateFin("");
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="space-y-1.5 lg:w-64">
          <Label htmlFor="commission-restaurant">Restaurant</Label>
          <Input id="commission-restaurant" value={restaurant} onChange={setRestaurant} onKeyDown={(event) => event.key === "Enter" && apply()} placeholder="Rechercher un restaurant" classNames={{ field: "h-10 rounded-xl bg-white" }} />
        </div>
        <div className="space-y-1.5 lg:w-48">
          <Label>Statut</Label>
          <Select value={statut} onValueChange={setStatut}>
            <SelectTrigger><SelectValue placeholder="Tous les statuts" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">Tous les statuts</SelectItem>
              <SelectItem value="en_attente">En attente</SelectItem>
              <SelectItem value="payee">Payée</SelectItem>
              <SelectItem value="annulee">Annulée</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="commission-date-debut">Du</Label>
          <DatePicker
            id="commission-date-debut"
            date={dateDebut ? new Date(`${dateDebut}T00:00:00`) : undefined}
            setDate={(date) => setDateDebut(date ? format(date, "yyyy-MM-dd") : "")}
            className="w-full lg:w-44"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="commission-date-fin">Au</Label>
          <DatePicker
            id="commission-date-fin"
            date={dateFin ? new Date(`${dateFin}T00:00:00`) : undefined}
            setDate={(date) => setDateFin(date ? format(date, "yyyy-MM-dd") : "")}
            className="w-full lg:w-44"
          />
        </div>
        <Button type="button" className="rounded-lg" onClick={apply}>Appliquer</Button>
        {(initialRestaurant || initialStatut || initialDateDebut || initialDateFin) && <Button type="button" variant="ghost" onClick={reset}>Réinitialiser</Button>}
      </div>
    </div>
  );
}
