"use client";

import { addDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarDays, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { DateRange, Matcher } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type UnavailablePeriod = {
  checkIn: string;
  checkOut: string;
  source?: "reservation" | "owner_block";
};

function parseIsoDate(value: string | undefined) {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function overlapsUnavailable(
  range: { checkIn: string; checkOut: string },
  periods: UnavailablePeriod[],
) {
  return periods.some(
    (period) =>
      range.checkIn < period.checkOut && range.checkOut > period.checkIn,
  );
}

function isUnavailableArrival(date: string, periods: UnavailablePeriod[]) {
  return periods.some(
    (period) => date >= period.checkIn && date < period.checkOut,
  );
}

function useDesktopCalendar() {
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const update = () => setDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return desktop;
}

export function ResidenceDateRangePicker({
  checkIn,
  checkOut,
  onChange,
  unavailable = [],
  minimumDate,
  className,
}: {
  checkIn: string;
  checkOut: string;
  onChange: (range: { checkIn: string; checkOut: string }) => void;
  unavailable?: UnavailablePeriod[];
  minimumDate: string;
  className?: string;
}) {
  const desktop = useDesktopCalendar();
  const [open, setOpen] = useState(false);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const from = parseIsoDate(checkIn);
  const to = parseIsoDate(checkOut);
  const minimum = parseIsoDate(minimumDate);
  const selected = useMemo<DateRange | undefined>(
    () => (from ? { from, to } : undefined),
    [checkIn, checkOut],
  );
  const unavailableMatchers = useMemo<Matcher[]>(
    () =>
      unavailable.flatMap((period) => {
        const periodStart = parseIsoDate(period.checkIn);
        const checkout = parseIsoDate(period.checkOut);
        if (!periodStart || !checkout) return [];
        return [{ from: periodStart, to: addDays(checkout, -1) }];
      }),
    [unavailable],
  );

  const handleSelect = (range: DateRange | undefined, selectedDay: Date) => {
    setSelectionError(null);
    if (!range?.from) {
      onChange({ checkIn: "", checkOut: "" });
      return;
    }

    const nextCheckIn = toIsoDate(range.from);
    if (!range.to) {
      if (isUnavailableArrival(nextCheckIn, unavailable)) {
        setSelectionError("Cette date d’arrivée est indisponible.");
        return;
      }
      onChange({ checkIn: nextCheckIn, checkOut: "" });
      return;
    }

    const nextRange = {
      checkIn: nextCheckIn,
      checkOut: toIsoDate(range.to),
    };
    if (overlapsUnavailable(nextRange, unavailable)) {
      const restartDate = toIsoDate(selectedDay);
      setSelectionError(
        "Cette période traverse des dates indisponibles. Choisissez une autre période.",
      );
      if (!isUnavailableArrival(restartDate, unavailable)) {
        onChange({ checkIn: restartDate, checkOut: "" });
      }
      return;
    }

    onChange(nextRange);
    setOpen(false);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="h-auto min-h-16 w-full justify-start px-3 py-2 text-left"
            aria-label="Choisir les dates d’arrivée et de départ"
          >
            <CalendarDays className="mr-1 size-5 text-primary" />
            <span className="grid min-w-0 flex-1 grid-cols-2 gap-3">
              <span className="min-w-0 border-r pr-3">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Arrivée
                </span>
                <span className="mt-1 block truncate text-sm font-medium text-foreground">
                  {from ? format(from, "d MMM yyyy", { locale: fr }) : "Choisir"}
                </span>
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Départ
                </span>
                <span className="mt-1 block truncate text-sm font-medium text-foreground">
                  {to ? format(to, "d MMM yyyy", { locale: fr }) : "Choisir"}
                </span>
              </span>
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-auto max-w-[calc(100vw-2rem)] gap-3 overflow-x-auto p-3"
        >
          <Calendar
            mode="range"
            selected={selected}
            onSelect={handleSelect}
            defaultMonth={from ?? minimum}
            startMonth={minimum}
            disabled={minimum ? [{ before: minimum }] : undefined}
            modifiers={{ unavailable: unavailableMatchers }}
            modifiersClassNames={{
              unavailable:
                "[&_button]:text-muted-foreground [&_button]:line-through [&_button]:decoration-destructive/70",
            }}
            min={1}
            numberOfMonths={desktop ? 2 : 1}
            locale={fr}
          />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="size-2.5 rounded-sm bg-primary" /> Sélection
              <span className="ml-2 size-2.5 rounded-sm border border-destructive/40 bg-muted" />
              Indisponible
            </div>
            {checkIn ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  onChange({ checkIn: "", checkOut: "" });
                  setSelectionError(null);
                }}
              >
                <X /> Effacer
              </Button>
            ) : null}
          </div>
          {selectionError ? (
            <p className="max-w-lg text-sm text-destructive" role="alert">
              {selectionError}
            </p>
          ) : null}
        </PopoverContent>
      </Popover>
      {unavailable.length > 0 ? (
        <p className="text-xs leading-5 text-muted-foreground">
          Les dates barrées sont déjà réservées ou bloquées.
        </p>
      ) : null}
    </div>
  );
}
