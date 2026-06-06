import React, { useState } from "react";
import { Clock, Plus, Trash2, HelpCircle, Calendar } from "lucide-react";
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
  exceptions,
  updateSchedule,
  updateExceptions,
  onNext,
  onPrev,
}: StepScheduleProps) {
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [excLabel, setExcLabel] = useState("");
  const [excDate, setExcDate] = useState("");
  const [excIsOpen, setExcIsOpen] = useState(false);
  const [excOpen, setExcOpen] = useState("11:00");
  const [excClose, setExcClose] = useState("16:00");

  const handleToggleDay = (index: number) => {
    const updated = [...schedule];
    updated[index].isOpen = !updated[index].isOpen;
    updateSchedule(updated);
  };

  const handleChangeTime = (index: number, field: "openTime" | "closeTime", value: string) => {
    const updated = [...schedule];
    updated[index][field] = value;
    updateSchedule(updated);
  };

  const handleAddException = (e: React.FormEvent) => {
    e.preventDefault();
    if (!excLabel || !excDate) return;

    const newExc: SpecialHourException = {
      id: Math.random().toString(36).substr(2, 9),
      date: excDate,
      label: excLabel,
      isOpen: excIsOpen,
      openTime: excOpen,
      closeTime: excClose,
    };

    updateExceptions([...exceptions, newExc]);
    // Reset exception fields
    setExcLabel("");
    setExcDate("");
    setExcIsOpen(false);
    setShowExceptionModal(false);
  };

  const handleRemoveException = (id: string) => {
    updateExceptions(exceptions.filter((exc) => exc.id !== id));
  };

  // Helper to format date in french format
  const formatFrenchDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
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
            Étape 3/4
          </span>
        </div>
        <h1 className="text-2xl font-bold font-display text-gray-900 tracking-tight leading-none">
          Horaires & Jours de service
        </h1>
        <p className="text-sm text-gray-500 mt-2 font-sans">
          Définissez les heures d'ouverture quotidiennes de votre établissement. Vous pouvez également configurer des fermetures exceptionnelles (jours fériés, événements).
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
                  row.isOpen ? "bg-white" : "bg-gray-55/30 opacity-70 text-gray-400 bg-gray-50/20"
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
                        value={row.openTime}
                        onChange={(e) => handleChangeTime(index, "openTime", e.target.value)}
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
                        value={row.closeTime}
                        onChange={(e) => handleChangeTime(index, "closeTime", e.target.value)}
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

        {/* Special Overrides Section */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 lg:p-8 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-sm font-bold text-gray-900 font-display">
                Horaires spéciaux <span className="text-gray-450 font-normal text-xs">(Optionnel)</span>
              </h3>
              <p className="text-xs text-gray-500 mt-1 font-sans">
                Ajoutez des horaires spécifiques pour les jours fériés ou des événements particuliers.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowExceptionModal(true)}
              className="px-4 py-2 bg-white border border-brand-500 hover:bg-brand-50/20 text-brand-500 text-xs font-bold rounded-xl inline-flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Ajouter une exception</span>
            </button>
          </div>

          {/* Exceptions lists */}
          {exceptions.length > 0 ? (
            <div className="space-y-3">
              {exceptions.map((exc) => (
                <div
                  key={exc.id}
                  className="p-4 border border-gray-100 rounded-xl flex items-center justify-between bg-gray-50/30"
                >
                  <div className="flex items-center space-x-3.5">
                    <div className="w-9 h-9 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-gray-900 block font-display">
                        {exc.label}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {formatFrenchDate(exc.date)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    {exc.isOpen ? (
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-150 text-[10px] font-bold rounded-md uppercase">
                        Ouvert • {exc.openTime} - {exc.closeTime}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-red-50 text-red-600 border border-red-150 text-[10px] font-bold rounded-md uppercase">
                        Fermé
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleRemoveException(exc.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg bg-white border border-gray-100 hover:border-red-100 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 border border-dashed border-gray-200 rounded-xl text-center">
              <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-400">Aucune exception ajoutée pour l'instant.</p>
            </div>
          )}
        </div>

        {/* Tip Box */}
        <div className="p-4 bg-emerald-50/50 border border-brand-100/30 rounded-xl flex items-start space-x-3">
          <HelpCircle className="w-5 h-5 text-brand-500 shrink-0 mt-0.5" />
          <div>
            <span className="text-xs font-bold text-gray-900 font-display block">Astuce</span>
            <p className="text-xs text-gray-600 mt-1 font-sans">
              Vous pourrez configurer des pauses méridiennes (fermeture l'après-midi, double plage d'ouverture) ainsi que des fermetures annuelles ultérieurement depuis le tableau de bord de votre restaurant.
            </p>
          </div>
        </div>
      </div>

      {/* Exception Creation Modal Overlay */}
      {showExceptionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs font-sans">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
            <div className="px-6 py-4 bg-brand-500 text-white flex items-center justify-between">
              <h3 className="font-bold text-base font-display">Nouvelle Exception</h3>
              <button
                type="button"
                onClick={() => setShowExceptionModal(false)}
                className="text-white/80 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddException} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Nom de l'exception *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Noël, Fête de la Musique"
                  value={excLabel}
                  onChange={(e) => setExcLabel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Date de l'exception *
                </label>
                <input
                  type="date"
                  required
                  value={excDate}
                  onChange={(e) => setExcDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex items-center space-x-3 py-2">
                <input
                  type="checkbox"
                  id="exc_open"
                  checked={excIsOpen}
                  onChange={() => setExcIsOpen(!excIsOpen)}
                  className="w-4 h-4 text-brand-500 border-gray-300 rounded focus:ring-brand-500"
                />
                <label htmlFor="exc_open" className="text-xs font-semibold text-gray-700 cursor-pointer">
                  Le restaurant sera exceptionnellement ouvert ce jour
                </label>
              </div>

              {excIsOpen && (
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Heure d'ouverture</label>
                    <input
                      type="time"
                      value={excOpen}
                      onChange={(e) => setExcOpen(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Heure de fermeture</label>
                    <input
                      type="time"
                      value={excClose}
                      onChange={(e) => setExcClose(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-brand-500"
                    />
                  </div>
                </div>
              )}

              <div className="pt-4 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowExceptionModal(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-500 text-white font-semibold text-xs rounded-lg hover:bg-brand-600 shadow-sm"
                >
                  Confirmer l'exception
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Buttons Block */}
      <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
        <button
          type="button"
          onClick={onPrev}
          className="px-5 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl inline-flex items-center space-x-2 transition-all cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span>Précédent</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          className="px-6 py-3 bg-brand-green hover:bg-brand-600 text-white text-sm font-semibold rounded-xl inline-flex items-center space-x-2 shadow-sm cursor-pointer transition-all active:scale-[0.98]"
        >
          <span>Suivant, Aperçu</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
