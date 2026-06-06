import React from "react";
import { Settings, Percent, DollarSign, Languages, Check } from "lucide-react";
import { RestaurantSettings } from "./types";

interface StepSettingsProps {
  data: RestaurantSettings;
  updateData: (fields: Partial<RestaurantSettings>) => void;
  onNext: () => void;
  onPrev: () => void;
}

const CATEGORIES_LIST = [
  { id: "bistrot", name: "Bistrot & Brasserie", desc: "Plats traditionnels cuisinés avec simplicité." },
  { id: "gastronomic", name: "Restaurant Gastronomique", desc: "Service d'exception, cuisine haute-couture." },
  { id: "fastfood", name: "Restauration Rapide", desc: "Burgers, tacos, poulet frit, service express." },
  { id: "bakery", name: "Boulangerie & Pâtisserie", desc: "Viennoiseries fraîches, pains de tradition et douceurs." },
  { id: "cafe", name: "Coffeeshop & Salon de thé", desc: "Spécialités de cafés, thés gourmands et snacks légers." },
  { id: "pizzeria", name: "Pizzéria", desc: "Pizzas au feu de bois et spécialités méditerranéennes." }
];

export default function StepSettings({ data, updateData, onNext, onPrev }: StepSettingsProps) {
  const toggleServiceType = (type: string) => {
    const current = data.serviceTypes || [];
    const updated = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    updateData({ serviceTypes: updated });
  };

  return (
    <div className="flex-1 max-w-4xl p-8 lg:p-12 overflow-y-auto font-sans">
      {/* Step Header */}
      <div className="mb-8">
        <div className="w-12 h-12 bg-emerald-50 text-brand-500 rounded-2xl flex items-center justify-center mb-4 ring-1 ring-emerald-100">
          <Settings className="w-6 h-6" />
        </div>
        <span className="text-xs font-mono text-gray-400 font-semibold uppercase tracking-wider block">
          Étape 5/6
        </span>
        <h1 className="text-3xl font-bold font-display text-gray-900 tracking-tight leading-none mt-1">
          Paramètres du restaurant
        </h1>
        <p className="text-sm text-gray-500 mt-2">
          Définissez le modèle opérationnel, la devise comptable, et la structure fiscale de votre entreprise.
        </p>
      </div>

      <div className="space-y-8 bg-white border border-gray-100 rounded-2xl p-6 lg:p-8 shadow-sm">
        {/* Category Grid Selection */}
        <div>
          <label className="block text-sm font-semibold text-gray-950 mb-3">
            Type d'établissement *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CATEGORIES_LIST.map((cat) => {
              const isSelected = data.category === cat.id;
              return (
                <div
                  key={cat.id}
                  onClick={() => updateData({ category: cat.id })}
                  className={`border rounded-xl p-4 cursor-pointer transition-all ${
                    isSelected
                      ? "border-brand-500 bg-brand-50/10 ring-2 ring-brand-50/50"
                      : "border-gray-150 bg-white hover:border-gray-250"
                  }`}
                >
                  <span className="text-sm font-bold block text-gray-950 font-display">
                    {cat.name}
                  </span>
                  <span className="text-[10px] text-gray-500 mt-1 block leading-relaxed">
                    {cat.desc}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Currency & Tax Side-by-Side */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Currency Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-950 mb-2">
              Devise monétaire
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <DollarSign className="h-4 w-4 text-gray-400" />
              </div>
              <select
                value={data.currency}
                onChange={(e) => updateData({ currency: e.target.value })}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 focus:border-brand-500 rounded-xl text-sm transition-all outline-none text-gray-800"
              >
                <option value="XOF">Franc CFA de l'UEMOA (FCFA)</option>
                <option value="EUR">Euro (€)</option>
                <option value="USD">U.S. Dollar ($)</option>
              </select>
            </div>
          </div>

          {/* Tax rate */}
          <div>
            <label className="block text-sm font-semibold text-gray-950 mb-2">
              TVA standard (%)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Percent className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="number"
                step="any"
                value={data.taxRate}
                onChange={(e) => updateData({ taxRate: parseFloat(e.target.value) || 0 })}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 focus:border-brand-500 rounded-xl text-sm transition-all outline-none text-gray-800"
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              TVA de 18% par défaut (Norme UEMOA).
            </p>
          </div>

          {/* Language Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-950 mb-2">
              Langue par défaut
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Languages className="h-4 w-4 text-gray-400" />
              </div>
              <select
                value={data.menuLanguage}
                onChange={(e) => updateData({ menuLanguage: e.target.value })}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 focus:border-brand-500 rounded-xl text-sm transition-all outline-none text-gray-800"
              >
                <option value="fr">Français (FR)</option>
                <option value="en">English (EN)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Operational Flow Service Types Selection */}
        <div>
          <label className="block text-sm font-semibold text-gray-950 mb-2">
            Types de services offerts *
          </label>
          <div className="space-y-3">
            {[
              { id: "dine-in", name: "Sur place (Dine-in)", desc: "Gestion des tables, réservations en ligne, et menu digital." },
              { id: "takeout", name: "A emporter (Takeaway)", desc: "Click & Collect direct avec paiement intégré." },
              { id: "delivery", name: "Livraison (Delivery)", desc: "Prise en charge logistique pour les livreurs dédiés." }
            ].map((srv) => {
              const isChecked = data.serviceTypes.includes(srv.id);
              return (
                <div
                  key={srv.id}
                  onClick={() => toggleServiceType(srv.id)}
                  className={`flex items-start p-3.5 border rounded-xl cursor-pointer transition-all ${
                    isChecked ? "border-brand-500 bg-brand-50/5" : "border-gray-150 hover:border-gray-200"
                  }`}
                >
                  <div className="flex items-center h-5 mr-3">
                    <div
                      className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                        isChecked ? "bg-brand-500 border-brand-500 text-white" : "border-gray-300 bg-white"
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-bold text-gray-900 block font-display">
                      {srv.name}
                    </span>
                    <span className="text-xs text-gray-500 mt-0.5 block leading-normal">
                      {srv.desc}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Feature toggles */}
        <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
          <div>
            <span className="text-sm font-bold text-gray-900 block font-display">
              Activer le module de réservation en ligne
            </span>
            <span className="text-xs text-gray-500 mt-1 block">
              Générez automatiquement un lien de réservation de table public pour vos clients.
            </span>
          </div>

          <button
            type="button"
            onClick={() => updateData({ enableOnlineBooking: !data.enableOnlineBooking })}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 outline-none ${
              data.enableOnlineBooking ? "bg-brand-500" : "bg-gray-200"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ${
                data.enableOnlineBooking ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Buttons Block */}
      <div className="flex justify-between mt-8 pt-6 border-t border-gray-100 font-sans">
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
          className="px-6 py-2.5 bg-brand-green hover:bg-brand-600 text-white text-sm font-semibold rounded-xl inline-flex items-center space-x-2 shadow-md shadow-brand-500/10 cursor-pointer transition-all"
        >
          <span>Suivant</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
