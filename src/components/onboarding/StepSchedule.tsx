import { ChevronLeft, ChevronRight, Clock, HelpCircle } from "lucide-react";
import React, { useMemo } from "react";
import { DaySchedule, SpecialHourException } from "./types";
import { Button } from "../ui/button";
import { AvailabilityScheduler } from "../motion/availability-scheduler";
import { WeekAvailability, DayKey, defaultWeek } from "../motion/availability-scheduler/types";

interface StepScheduleProps {
  schedule: DaySchedule[];
  exceptions: SpecialHourException[];
  updateSchedule: (newSchedule: DaySchedule[]) => void;
  updateExceptions: (newExceptions: SpecialHourException[]) => void;
  onNext: () => void;
  onPrev: () => void;
}

const mapScheduleToWeek = (schedule: DaySchedule[]): WeekAvailability => {
  const mapKey: Record<string, DayKey> = {
    "Lundi": "mon",
    "Mardi": "tue",
    "Mercredi": "wed",
    "Jeudi": "thu",
    "Vendredi": "fri",
    "Samedi": "sat",
    "Dimanche": "sun"
  };

  const week: Partial<WeekAvailability> = {};

  schedule.forEach((s) => {
    const key = mapKey[s.day];
    if (key) {
      week[key] = {
        enabled: s.isOpen,
        ranges: [{ id: `${key}-0`, start: s.openTime, end: s.closeTime }]
      };
    }
  });

  const defaultW = defaultWeek();
  return { ...defaultW, ...week } as WeekAvailability;
};

const mapWeekToSchedule = (week: WeekAvailability): DaySchedule[] => {
  const days: { key: DayKey; day: string }[] = [
    { key: "mon", day: "Lundi" },
    { key: "tue", day: "Mardi" },
    { key: "wed", day: "Mercredi" },
    { key: "thu", day: "Jeudi" },
    { key: "fri", day: "Vendredi" },
    { key: "sat", day: "Samedi" },
    { key: "sun", day: "Dimanche" }
  ];

  return days.map(({ key, day }) => {
    const wDay = week[key];
    const range = wDay.ranges[0] || { start: "08:00", end: "22:00" };
    return {
      day,
      isOpen: wDay.enabled,
      openTime: range.start,
      closeTime: range.end,
    };
  });
};

export default function StepSchedule({
  schedule,
  updateSchedule,
  onNext,
  onPrev,
}: StepScheduleProps) {

  const weekAvailability = useMemo(() => mapScheduleToWeek(schedule), [schedule]);

  const handleWeekChange = (newWeek: WeekAvailability) => {
    updateSchedule(mapWeekToSchedule(newWeek));
  };

  return (
    <div className="flex-1 max-w-4xl p-6 lg:p-10 overflow-y-auto">
      {/* Step Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-3">
          <span className="text-xs font-mono text-gray-400 font-semibold uppercase tracking-wider">
            Étape 3/5
          </span>
        </div>
        <h1 className="text-2xl font-bold font-display text-gray-900 tracking-tight leading-none">
          Horaires & Jours de service
        </h1>
        <p className="text-sm text-gray-500 mt-2 font-sans">
          Définissez les heures d&apos;ouverture quotidiennes de votre établissement.
        </p>
      </div>

      <div className="space-y-8">
        {/* Availability Scheduler */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <AvailabilityScheduler
            value={weekAvailability}
            onChange={handleWeekChange}
            className="max-w-none"
          />
        </div>
      </div>

      {/* Buttons Block */}
      <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
        <Button
          onClick={onPrev}
          variant="outline"
        >
          <ChevronLeft />
          Précédent
        </Button>

        <Button
          onClick={onNext}
        >
          Suivant, Aperçu
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
