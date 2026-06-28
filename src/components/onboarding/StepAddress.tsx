import React, { useState } from "react";
import { MapPin, Phone, Mail, Globe, MessageSquare, ChevronRight, Sparkles } from "lucide-react";
import { AddressContact } from "./types";
import InteractiveMap from "./InteractiveMap";

interface StepAddressProps {
  data: AddressContact;
  updateData: (fields: Partial<AddressContact>) => void;
  onNext: () => void;
  onPrev: () => void;
}

const COMMUNES_LIST = [
  "Marcory",
  "Cocody",
  "Plateau",
  "Treachville",
  "Yopougon",
  "Koumassi",
  "Port-Bouet",
  "Adjamé"
];

export default function StepAddress({ data, updateData, onNext, onPrev }: StepAddressProps) {
  const [error, setError] = useState<string | null>(null);

  // Live coordinates change from interactive map clicks
  const handleMapChange = (lat: number, lng: number, commune: string, quarter?: string, address?: string) => {
    updateData({
      latitude: lat,
      longitude: lng,
      commune: commune,
      quarter: quarter || data.quarter,
      fullAddress: address || data.fullAddress
    });
  };

  const validateAndProceed = () => {
    if (!data.commune) {
      setError("La commune est requise.");
      return;
    }
    if (!data.fullAddress.trim()) {
      setError("L'adresse complète est requise.");
      return;
    }
    if (!data.phone.trim()) {
      setError("Le numéro de téléphone est requis.");
      return;
    }
    if (!data.email.trim()) {
      setError("L'adresse email est requise.");
      return;
    }
    // Simple email regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      setError("Veuillez entrer une adresse email valide.");
      return;
    }

    setError(null);
    onNext();
  };

  return (
    <div className="flex-1 max-w-4xl p-8 lg:p-12 overflow-y-auto">
      {/* Step Header */}
      <div className="mb-8">
        <div className="w-12 h-12 bg-emerald-50 text-brand-500 rounded-2xl flex items-center justify-center mb-4 ring-1 ring-emerald-100">
          <MapPin className="w-6 h-6" />
        </div>
        <span className="text-xs font-mono text-gray-400 font-semibold uppercase tracking-wider block">
          Étape 2/3
        </span>
        <h1 className="text-2xl font-bold font-display text-gray-900 tracking-tight leading-none mt-1">
          Adresse & Contact GPS
        </h1>
        <p className="text-sm text-gray-500 mt-2 font-sans">
          Ajoutez l&apos;adresse de votre restaurant et vos coordonnées pour que vos futurs clients puissent vous géolocaliser.
        </p>
      </div>

      <div className="space-y-8 bg-white border border-gray-100 rounded-2xl p-6 lg:p-8 shadow-sm">
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-medium font-sans">
            ⚠️ {error}
          </div>
        )}

        {/* Location Dropdowns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Pays *
            </label>
            <div className="relative">
              <select
                disabled
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-500 rounded-xl text-sm font-sans outline-none appearance-none cursor-not-allowed"
              >
                <option>🇨🇮 Côte d&apos;Ivoire</option>
              </select>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              Plateforme hébergée exclusivement en Côte d&apos;Ivoire.
            </p>
          </div>

          <div>
            <label htmlFor="city" className="block text-sm font-semibold text-gray-900 mb-2">
              Ville *
            </label>
            <select
              value={data.city}
              onChange={(e) => updateData({ city: e.target.value })}
              className="w-full px-4 py-3 bg-white border border-gray-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-50 rounded-xl text-sm transition-all font-sans outline-none text-gray-800"
            >
              <option value="Abidjan">Abidjan</option>
              <option value="Yamoussoukro">Yamoussoukro</option>
              <option value="San-Pédro">San-Pédro</option>
              <option value="Bouaké">Bouaké</option>
            </select>
          </div>
        </div>

        {/* Local District Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="commune" className="block text-sm font-semibold text-gray-900 mb-2">
              Commune *
            </label>
            <select
              value={data.commune}
              onChange={(e) => updateData({ commune: e.target.value })}
              className="w-full px-4 py-3 bg-white border border-gray-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-50 rounded-xl text-sm transition-all font-sans outline-none text-gray-800"
            >
              {COMMUNES_LIST.map((comm) => (
                <option key={comm} value={comm}>
                  {comm}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="quarter" className="block text-sm font-semibold text-gray-900 mb-2">
              Quartier
            </label>
            <input
              type="text"
              id="quarter"
              placeholder="Ex: Zone 4C, Deux-Plateaux Vallons"
              value={data.quarter}
              onChange={(e) => updateData({ quarter: e.target.value })}
              className="w-full px-4 py-3 bg-white border border-gray-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-50 rounded-xl text-sm transition-all font-sans outline-none text-gray-800 placeholder-gray-400"
            />
          </div>
        </div>

        {/* Full Address */}
        <div>
          <label htmlFor="fullAddress" className="block text-sm font-semibold text-gray-900 mb-2">
            Adresse complète *
          </label>
          <input
            type="text"
            id="fullAddress"
            placeholder="Ex: Boulevard de Marseille, en face du supermarché, Zone 4"
            value={data.fullAddress}
            onChange={(e) => updateData({ fullAddress: e.target.value })}
            className="w-full px-4 py-3 bg-white border border-gray-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-50 rounded-xl text-sm transition-all font-sans outline-none text-gray-800 placeholder-gray-400"
          />
          <p className="text-[11px] text-gray-450 mt-1.5 font-sans italic text-gray-400">
            Soyez précis pour aider vos clients et vos livreurs à vous localiser facilement.
          </p>
        </div>

        {/* Drag/Click Interactive Map segment */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <label className="block text-sm font-semibold text-gray-900">
              Localisation sur la carte *
            </label>
            <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Cliquez n&apos;importe où sur la carte pour placer le repère
            </span>
          </div>

          {/* Map */}
          <InteractiveMap
            latitude={data.latitude}
            longitude={data.longitude}
            commune={data.commune}
            onCoordinatesChange={handleMapChange}
          />

          {/* Coordinates status badging instead of raw inputs */}
          <div className="mt-3 flex items-center justify-between text-xs text-gray-500 bg-gray-50 border border-gray-100 px-3 py-2 rounded-xl font-mono">
            <span className="flex items-center gap-1.5 font-sans font-medium text-gray-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Géopositionnement résolu
            </span>
            <span className="text-gray-400 font-medium text-[11.5px]">
              LAT {data.latitude.toFixed(5)} • LNG {data.longitude.toFixed(5)}
            </span>
          </div>
        </div>

        {/* Divider */}
        <hr className="border-gray-100" />

        {/* Contact Info Group */}
        <div>
          <h3 className="block text-sm font-semibold text-gray-950 mb-4">
            Coordonnées de l&apos;établissement
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-xs font-semibold text-gray-700 mb-1.5">
                Téléphone *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="tel"
                  id="phone"
                  placeholder="+225 01 23 45 67 89"
                  value={data.phone}
                  onChange={(e) => updateData({ phone: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-50 rounded-xl text-sm transition-all font-sans outline-none text-gray-800"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-gray-700 mb-1.5">
                Adresse email de contact *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="email"
                  id="email"
                  placeholder="contact@monrestaurant.ci"
                  value={data.email}
                  onChange={(e) => updateData({ email: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-50 rounded-xl text-sm transition-all font-sans outline-none text-gray-800"
                />
              </div>
            </div>

            {/* WhatsApp */}
            <div>
              <label htmlFor="whatsapp" className="block text-xs font-semibold text-gray-700 mb-1.5">
                Numéro WhatsApp
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MessageSquare className="h-4 w-4 text-emerald-500" />
                </div>
                <input
                  type="tel"
                  id="whatsapp"
                  placeholder="+225 01 23 45 67 89"
                  value={data.whatsapp}
                  onChange={(e) => updateData({ whatsapp: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-50 rounded-xl text-sm transition-all font-sans outline-none text-gray-800"
                />
              </div>
            </div>

            {/* Website URL */}
            <div>
              <label htmlFor="website" className="block text-xs font-semibold text-gray-700 mb-1.5">
                Site Internet
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Globe className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="url"
                  id="website"
                  placeholder="https://www.monrestaurant.ci"
                  value={data.website}
                  onChange={(e) => updateData({ website: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-50 rounded-xl text-sm transition-all font-sans outline-none text-gray-800"
                />
              </div>
            </div>
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
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span>Précédent</span>
        </button>

        <button
          type="button"
          onClick={validateAndProceed}
          className="px-6 py-2.5 bg-brand-green hover:bg-brand-600 text-white text-sm font-semibold rounded-xl inline-flex items-center space-x-2 shadow-sm cursor-pointer transition-all active:scale-[0.98]"
        >
          <span>Suivant, Horaires</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
