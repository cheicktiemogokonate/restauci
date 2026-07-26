import { Clock, HelpCircle } from "lucide-react";
import React from "react";
import { DaySchedule, SpecialHourException } from "./types";

interface StepScheduleProps {
  schedule: DaySchedule[];
  exceptions: SpecialHourException[];
  updateSchedule: (newSchedule: DaySchedule[]) => void;
  updateExceptions: (newExceptions: SpecialHourException[]) => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function StepSchedule({
  schedule,
  updateSchedule,
  onNext,
  onPrev,
}: StepScheduleProps) {
  const handleToggleDay = (index: number) => {
    const updated = [...schedule];
    updated[index].isOpen = !updated[index].isOpen;
    updateSchedule(updated);
  };

  const handleChangeTime = (
    index: number,
    field: "openTime" | "closeTime",
    value: string,
  ) => {
    const updated = [...schedule];
    updated[index][field] = value;
    updateSchedule(updated);
  };

  return (
    <div className="flex-1 max-w-4xl p-6 lg:p-10 overflow-y-auto">
      {/* Step Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-10 h-10 bg-emerald-50 text-brand-500 rounded-xl flex items-center justify-center ring-1 ring-emerald-100">
            <Clock className="w-5 h-5" />
          </div>
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
        {/* Day-by-Day Table */}
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 grid grid-cols-12 gap-4 text-xs font-bold text-gray-500 uppercase tracking-wider font-display">
            <span className="col-span-4">Jour</span>
            <span className="col-span-2 text-center">Statut</span>
            <span className="col-span-3">Heure d'ouverture</span>
            <span className="col-span-3">Heure de fermeture</span>
          </div>

          <div className="divide-y divide-gray-100 font-sans">
            {schedule.map((row, index) => (
              <div
                key={row.day}
                className={`px-6 py-4 grid grid-cols-12 gap-4 items-center transition-all ${
                  row.isOpen
                    ? "bg-white"
                    : "bg-gray-55/30 opacity-70 text-gray-400 bg-gray-50/20"
                }`}
              >
                {/* Day label */}
                <span className="col-span-4 text-sm font-semibold text-gray-950 uppercase first-letter:capitalize">
                  {row.day}
                </span>

                {/* Status Switch (Green when open) */}
                <div className="col-span-2 flex justify-center">
                  <button
                    type="button"
                    onClick={() => handleToggleDay(index)}
                    aria-label={`${row.isOpen ? "Fermer" : "Ouvrir"} le ${row.day}`}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 outline-none ${
                      row.isOpen ? "bg-brand-500" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ${
                        row.isOpen ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Opening Hours dropdown */}
                <div className="col-span-3">
                  {row.isOpen ? (
                    <div className="relative">
                      <select
                        aria-label={`Heure d’ouverture du ${row.day}`}
                        value={row.openTime}
                        onChange={(e) =>
                          handleChangeTime(index, "openTime", e.target.value)
                        }
                        className="w-full px-3 py-2 bg-white border border-gray-200 text-gray-800 rounded-xl text-sm font-mono outline-none focus:border-brand-500 font-medium select-none"
                      >
                        {Array.from({ length: 24 }).map((_, h) => {
                          const hour = String(h).padStart(2, "0");
                          return (
                            <React.Fragment key={hour}>
                              <option value={`${hour}:00`}>{hour}:00</option>
                              <option value={`${hour}:30`}>{hour}:30</option>
                            </React.Fragment>
                          );
                        })}
                      </select>
                    </div>
                  ) : (
                    <input
                      type="text"
                      disabled
                      value="Fermé"
                      className="w-full px-3 py-2 bg-gray-50/50 border border-gray-100 text-gray-450 text-center rounded-xl text-xs font-semibold outline-none"
                    />
                  )}
                </div>

                {/* Closing Hours dropdown */}
                <div className="col-span-3">
                  {row.isOpen ? (
                    <div className="relative">
                      <select
                        aria-label={`Heure de fermeture du ${row.day}`}
                        value={row.closeTime}
                        onChange={(e) =>
                          handleChangeTime(index, "closeTime", e.target.value)
                        }
                        className="w-full px-3 py-2 bg-white border border-gray-200 text-gray-800 rounded-xl text-sm font-mono outline-none focus:border-brand-500 font-medium select-none"
                      >
                        {Array.from({ length: 24 }).map((_, h) => {
                          const hour = String(h).padStart(2, "0");
                          return (
                            <React.Fragment key={hour}>
                              <option value={`${hour}:00`}>{hour}:00</option>
                              <option value={`${hour}:30`}>{hour}:30</option>
                            </React.Fragment>
                          );
                        })}
                      </select>
                    </div>
                  ) : (
                    <input
                      type="text"
                      disabled
                      value="Fermé"
                      className="w-full px-3 py-2 bg-gray-50/50 border border-gray-100 text-gray-450 text-center rounded-xl text-xs font-semibold outline-none"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tip Box */}
        <div className="p-4 bg-emerald-50/50 border border-brand-100/30 rounded-xl flex items-start space-x-3">
          <HelpCircle className="w-5 h-5 text-brand-500 shrink-0 mt-0.5" />
          <div>
            <span className="text-xs font-bold text-gray-900 font-display block">
              Astuce
            </span>
            <p className="text-xs text-gray-600 mt-1 font-sans">
              Vous pourrez ajouter plusieurs créneaux et ajuster ces horaires
              depuis le profil de votre restaurant.
            </p>
          </div>
        </div>
      </div>

      {/* Buttons Block */}
      <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
        <button
          type="button"
          onClick={onPrev}
          className="px-5 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl inline-flex items-center space-x-2 transition-all cursor-pointer"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          <span>Précédent</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          className="px-6 py-3 bg-brand-green hover:bg-brand-600 text-white text-sm font-semibold rounded-xl inline-flex items-center space-x-2 shadow-sm cursor-pointer transition-all active:scale-[0.98]"
        >
          <span>Suivant, Aperçu</span>
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
