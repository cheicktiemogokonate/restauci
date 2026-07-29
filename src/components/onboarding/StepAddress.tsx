import React, { useState } from "react";
import { Phone, Mail, Globe, MessageSquare, ChevronRight, ChevronLeft } from "lucide-react";
import { AddressContact } from "./types";
import InteractiveMap from "./InteractiveMap";
import { Button } from "../ui/button";
import { Input } from "@/components/motion/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/motion/select";
import { Label } from "@/components/ui/label";

interface StepAddressProps {
  data: AddressContact;
  updateData: (fields: Partial<AddressContact>) => void;
  onNext: () => void;
  onPrev: () => void;
}

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
        <span className="text-xs font-mono text-gray-400 font-semibold uppercase tracking-wider block">
          Étape 2/5
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
          <div className="flex flex-col gap-2">
            <Label className="px-1 text-[11px] font-bold tracking-[0.08em] text-[#173c2f]/75 uppercase">
              Pays *
            </Label>
            <Select value="ci" disabled>
              <SelectTrigger className="h-12 rounded-2xl border-black/8 bg-[#f7faf8] px-4 font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ci">🇨🇮 Côte d&apos;Ivoire</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-gray-400 mt-1">Zone de service actuelle.</p>
          </div>

          <Input
              id="city"
              name="city"
              type="text"
              label="Ville *"
              autoComplete="address-level2"
              value={data.city}
              onChange={(city) => updateData({ city })}
              placeholder="Ex. Bouaké, Abidjan, Korhogo"
            />
        </div>

        {/* Local District Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
              id="commune"
              name="commune"
              type="text"
              label="Commune *"
              value={data.commune}
              onChange={(commune) => updateData({ commune })}
              placeholder="Commune, sous-préfecture ou secteur"
            />

          <Input
              type="text"
              id="quarter"
              name="address-level3"
              label="Quartier"
              placeholder="Ex: Zone 4C, Deux-Plateaux Vallons"
              value={data.quarter}
              onChange={(quarter) => updateData({ quarter })}
            />
        </div>

        {/* Full Address */}
        <div className="space-y-1.5">
          <Input
            type="text"
            id="fullAddress"
            name="street-address"
            label="Adresse complète *"
            autoComplete="street-address"
            placeholder="Ex: Boulevard de Marseille, en face du supermarché, Zone 4"
            value={data.fullAddress}
            onChange={(fullAddress) => updateData({ fullAddress })}
          />
          <p className="text-[11px] text-gray-450 mt-1.5 font-sans italic text-gray-400">
            Soyez précis pour aider vos clients et vos livreurs à vous localiser facilement.
          </p>
        </div>

        {/* Drag/Click Interactive Map segment */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <Label className="block text-sm font-semibold text-gray-900">
              Localisation sur la carte *
            </Label>
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
            <Input
                  type="tel"
                  id="phone"
                  name="tel"
                  label="Téléphone *"
                  autoComplete="tel"
                  placeholder="+225 01 23 45 67 89"
                  value={data.phone}
                  onChange={(phone) => updateData({ phone })}
                  leftIcon={<Phone />}
                />

            {/* Email */}
            <Input
                  type="email"
                  id="email"
                  name="email"
                  label="Adresse email de contact *"
                  autoComplete="email"
                  placeholder="contact@monrestaurant.ci"
                  value={data.email}
                  onChange={(email) => updateData({ email })}
                  leftIcon={<Mail />}
                />

            {/* WhatsApp */}
            <Input
                  type="tel"
                  id="whatsapp"
                  name="whatsapp"
                  label="Numéro WhatsApp"
                  placeholder="+225 01 23 45 67 89"
                  value={data.whatsapp}
                  onChange={(whatsapp) => updateData({ whatsapp })}
                  leftIcon={<MessageSquare className="text-emerald-500" />}
                />

            {/* Website URL */}
            <Input
                  type="url"
                  id="website"
                  name="url"
                  label="Site Internet"
                  placeholder="https://www.monrestaurant.ci"
                  value={data.website}
                  onChange={(website) => updateData({ website })}
                  leftIcon={<Globe />}
                />
          </div>
        </div>
      </div>

      {/* Buttons Block */}
      <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">

        <Button onClick={onPrev} variant="outline" >
          <ChevronLeft />
          Précédent
        </Button>

        <Button onClick={validateAndProceed} >
          Suivant, Horaires
          <ChevronRight />
        </Button>

      </div>
    </div>
  );
}
