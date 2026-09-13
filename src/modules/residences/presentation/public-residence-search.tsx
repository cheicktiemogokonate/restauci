"use client";

import { MapPin, Search, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { ResidenceDateRangePicker } from "./residence-date-range-picker";
import { Input } from "@/components/motion/input";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";

export function PublicResidenceSearch({
  initialDestination,
  initialCheckIn,
  initialCheckOut,
  initialGuests,
  minimumDate,
}: {
  initialDestination?: string;
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialGuests?: number;
  minimumDate: string;
}) {
  const router = useRouter();
  const [destination, setDestination] = useState(initialDestination ?? "");
  const [stay, setStay] = useState({
    checkIn: initialCheckIn ?? "",
    checkOut: initialCheckOut ?? "",
  });
  const [guests, setGuests] = useState(initialGuests ? String(initialGuests) : "");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = new URLSearchParams();
    if (destination.trim()) query.set("destination", destination.trim());
    if (stay.checkIn && stay.checkOut) {
      query.set("checkIn", stay.checkIn);
      query.set("checkOut", stay.checkOut);
    }
    if (guests && Number(guests) > 0) query.set("guests", guests);
    router.push(query.size > 0 ? `/residences?${query}` : "/residences");
  };

  const clear = () => {
    setDestination("");
    setStay({ checkIn: "", checkOut: "" });
    setGuests("");
    router.push("/residences");
  };

  const hasFilters = Boolean(destination || stay.checkIn || guests);

  return (
    <form
      onSubmit={submit}
      className="mt-8 grid gap-3 rounded-2xl border border-emerald-950/10 bg-white p-3 shadow-[0_18px_50px_-30px_rgba(6,78,59,0.45)] lg:grid-cols-[minmax(220px,1fr)_minmax(320px,1.35fr)_160px_auto] lg:items-end"
    >
      <Field>
        <FieldLabel htmlFor="residence-destination">Destination</FieldLabel>
        <Input
          id="residence-destination"
          value={destination}
          onChange={setDestination}
          placeholder="Abidjan, Grand-Bassam…"
          leftIcon={<MapPin />}
          classNames={{ field: "h-16 bg-white" }}
          maxLength={100}
        />
      </Field>

      <Field>
        <FieldLabel>Dates du séjour</FieldLabel>
        <ResidenceDateRangePicker
          checkIn={stay.checkIn}
          checkOut={stay.checkOut}
          onChange={setStay}
          minimumDate={minimumDate}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="residence-guests">Voyageurs</FieldLabel>
        <Input
          id="residence-guests"
          type="number"
          min={1}
          max={100}
          step={1}
          value={guests}
          onChange={setGuests}
          placeholder="2"
          leftIcon={<Users />}
          classNames={{ field: "h-16 bg-white" }}
        />
      </Field>

      <div className="flex gap-2 lg:pb-0">
        {hasFilters ? (
          <Button type="button" variant="ghost" size="icon-lg" onClick={clear} aria-label="Effacer la recherche">
            <X />
          </Button>
        ) : null}
        <Button type="submit" size="lg" className="h-16 flex-1 px-5 lg:flex-none">
          <Search data-icon="inline-start" /> Rechercher
        </Button>
      </div>
    </form>
  );
}
