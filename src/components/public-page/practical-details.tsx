"use client";

import {
  CalendarRange,
  Check,
  ChefHat,
  Clock,
  CreditCard,
  Smartphone,
} from "lucide-react";

interface PracticalDetailsProps {
  onOpenReserve: () => void;
}

export default function PracticalDetails({
  onOpenReserve,
}: PracticalDetailsProps) {
  return (
    <section className="py-20 bg-gray-50/60 border-y border-gray-100/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Title */}
        <div className="text-center md:text-left space-y-3">
          <span className="text-xs uppercase font-extrabold text-[#0b663b] tracking-widest flex items-center justify-center md:justify-start gap-1.5">
            <span className="w-6 h-0.5 bg-[#0b663b] inline-block" />
            Informations pratiques
          </span>
          <h2 className="text-3xl font-extrabold font-serif tracking-tight text-gray-950">
            Tout pour faciliter votre visite
          </h2>
        </div>

        {/* 4 Cards Grid - Matches exact UI specs of maquette */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Horaires d'ouverture */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="bg-[#0b663b]/10 text-[#0b663b] p-2.5 rounded-2xl">
                  <Clock className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-gray-900 text-sm">
                  Horaires d&apos;ouverture
                </h3>
              </div>

              <div className="space-y-3.5 text-xs text-gray-600 font-medium">
                <div className="flex justify-between items-center pb-2 border-b border-gray-50">
                  <span className="text-gray-400">Lundi - Vendredi</span>
                  <span className="font-bold text-gray-800">10:00 - 22:30</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-gray-50">
                  <span className="text-gray-400">Samedi</span>
                  <span className="font-bold text-gray-800 animate-pulse-slow">
                    10:00 - 23:30
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Dimanche</span>
                  <span className="font-bold text-gray-800">10:00 - 16:00</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-50 text-[10px] text-gray-400 font-semibold flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block animate-ping" />
              <span>Ouvert les jours fériés</span>
            </div>
          </div>

          {/* Card 2: Services disponibles */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="bg-[#0b663b]/10 text-[#0b663b] p-2.5 rounded-2xl">
                <ChefHat className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-gray-900 text-sm">
                Services disponibles
              </h3>
            </div>

            <div className="space-y-3 text-xs text-gray-600 font-medium">
              <div className="flex items-center gap-2.5">
                <div className="h-5 w-5 rounded-md bg-[#0b663b]/10 text-[#0b663b] flex items-center justify-center">
                  <Check className="h-3 w-3 stroke-3" />
                </div>
                <span>Sur place (salle ou terrasse)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="h-5 w-5 rounded-md bg-[#0b663b]/10 text-[#0b663b] flex items-center justify-center">
                  <Check className="h-3 w-3 stroke-3" />
                </div>
                <span>À emporter, service rapide</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="h-5 w-5 rounded-md bg-[#0b663b]/10 text-[#0b663b] flex items-center justify-center">
                  <Check className="h-3 w-3 stroke-3" />
                </div>
                <span>Livraison à domicile (Abidjan)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="h-5 w-5 rounded-md bg-[#0b663b]/10 text-[#0b663b] flex items-center justify-center">
                  <Check className="h-3 w-3 stroke-3" />
                </div>
                <span>Réservation de tables incluse</span>
              </div>
            </div>
          </div>

          {/* Card 3: Modes de paiement */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="bg-[#0b663b]/10 text-[#0b663b] p-2.5 rounded-2xl">
                <CreditCard className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-gray-900 text-sm">
                Modes de paiement
              </h3>
            </div>

            <div className="space-y-3 text-xs text-gray-600 font-medium">
              <div className="flex items-center gap-2.5">
                <div className="h-5 w-5 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Check className="h-3 w-3" />
                </div>
                <span>Espèces / Cash</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="h-5 w-5 rounded-md bg-[#0b663b]/10 text-[#0b663b] flex items-center justify-center">
                  <CreditCard className="h-3 w-3" />
                </div>
                <span>Carte bancaire (Visa, Mastercard)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="h-5 w-5 rounded-md bg-orange-50 text-orange-600 flex items-center justify-center">
                  <Smartphone className="h-3 w-3" />
                </div>
                <span className="flex items-center gap-1">
                  Orange Money{" "}
                  <span className="text-[9px] bg-orange-100 text-orange-800 font-bold px-1 py-0.5 rounded uppercase">
                    OM
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="h-5 w-5 rounded-md bg-sky-50 text-sky-600 flex items-center justify-center">
                  <Smartphone className="h-3 w-3" />
                </div>
                <span className="flex items-center gap-1">
                  Wave & Moov Money{" "}
                  <span className="text-[9px] bg-sky-100 text-sky-800 font-bold px-1 py-0.5 rounded uppercase">
                    Wave
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Reservation button CTA */}
          <div className="bg-[#0b663b] rounded-3xl shadow-lg p-6 flex flex-col justify-between text-white relative overflow-hidden group">
            <div className="absolute -top-12 -right-12 h-36 w-36 bg-emerald-800/20 rounded-full blur-2xl group-hover:scale-125 transition duration-500" />

            <div className="relative">
              <div className="bg-white/10 text-[#e2b34a] p-2.5 rounded-2xl w-fit mb-5">
                <CalendarRange className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-white text-sm">
                Réservation en direct
              </h3>
              <p className="text-xs text-emerald-100/85 font-light mt-2.5 leading-relaxed">
                Réservez votre table préférée en quelques secondes et recevez
                une confirmation immédiate par SMS.
              </p>
            </div>

            <button
              onClick={onOpenReserve}
              className="mt-6 w-full bg-[#e2b34a] hover:bg-amber-400 text-gray-950 font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition duration-200 cursor-pointer select-none active:scale-[0.98]"
            >
              <span>Réserver maintenant</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
