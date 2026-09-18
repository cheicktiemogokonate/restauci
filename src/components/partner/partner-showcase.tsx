"use client";

import { useState } from "react";
import {
  Building2,
  Clock,
  MapPin,
  ShieldCheck,
  Sparkles,
  Store,
  Truck,
} from "lucide-react";
import { MotionButton } from "@/components/ui/motion-button";

export function PartnerShowcase() {
  const [view, setView] = useState<"restaurant" | "residence">("restaurant");
  const [orderStatus, setOrderStatus] = useState<"prep" | "ready">("prep");

  return (
    <section className="py-20 md:py-28 bg-transparent border-t border-[#dfe8e2]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#e7f3ec] text-[#0d3d28] border border-[#087a50]/20 mb-3">
            <Sparkles className="size-3.5 text-[#13b981]" />
            Aperçu de l’Interface Pro
          </span>
          <h2 className="font-heading font-black text-3xl sm:text-4xl lg:text-5xl text-[#102d1f] tracking-tight mb-4">
            Un outil pensé pour le terrain.
          </h2>
          <p className="text-sm sm:text-base text-[#102d1f]/75 leading-relaxed">
            Accessible depuis n’importe quel smartphone, tablette ou ordinateur. Aucun paramétrage complexe, vous prenez en main votre espace en quelques minutes.
          </p>

          {/* View selector */}
          <div className="mt-8 inline-flex p-1.5 rounded-2xl bg-white border border-[#dfe8e2] shadow-xs">
            <button
              type="button"
              onClick={() => setView("restaurant")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                view === "restaurant"
                  ? "bg-[#0d3d28] text-white shadow-xs"
                  : "text-[#5e6e64] hover:text-[#0d3d28]"
              }`}
            >
              <Store className="size-4" />
              Écran Cuisine & Commandes
            </button>
            <button
              type="button"
              onClick={() => setView("residence")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                view === "residence"
                  ? "bg-[#0d3d28] text-white shadow-xs"
                  : "text-[#5e6e64] hover:text-[#0d3d28]"
              }`}
            >
              <Building2 className="size-4" />
              Gestion Réservations & Nuitées
            </button>
          </div>
        </div>

        {/* Realistic Mockup Container */}
        <div className="max-w-4xl mx-auto rounded-3xl bg-white border border-[#dfe8e2] shadow-xl overflow-hidden">
          {/* Top simulated browser bar */}
          <div className="bg-[#102d1f] px-5 py-3.5 flex items-center justify-between text-white border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-rose-500/80" />
              <span className="size-3 rounded-full bg-amber-500/80" />
              <span className="size-3 rounded-full bg-emerald-500/80" />
              <span className="ml-3 text-xs text-white/60 font-mono hidden sm:inline">
                partenaire.toutci.ci/{view === "restaurant" ? "cuisine/commandes" : "residence/calendrier"}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                En direct
              </span>
              <span className="text-white/40">|</span>
              <span className="text-white/80 font-medium">
                {view === "restaurant" ? "L'Atelier Gourmet (Marcory)" : "Villa Palmeraie (Riviera 3)"}
              </span>
            </div>
          </div>

          {/* Interactive Screen Content */}
          {view === "restaurant" ? (
            <div className="p-6 sm:p-8 bg-[#fbfdfb]">
              {/* Restaurant KPI Strip */}
              <div className="grid grid-cols-3 gap-4 mb-6 text-center">
                <div className="p-3.5 rounded-2xl bg-[#edf5f0] border border-[#dfe8e2]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#5e6e64] block">
                    Commandes aujourd’hui
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-[#0d3d28]">
                    38
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#edf5f0] border border-[#dfe8e2]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#5e6e64] block">
                    Chiffre d’affaires
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-[#0d3d28]">
                    324 000 F
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#edf5f0] border border-[#dfe8e2]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#5e6e64] block">
                    Temps moyen prépa
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-[#087a50]">
                    21 min
                  </span>
                </div>
              </div>

              {/* Active Ticket Card */}
              <div className="rounded-2xl border-2 border-[#087a50] bg-white p-5 sm:p-6 shadow-md relative">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#dfe8e2]">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-[#0d3d28] text-white">
                      #CMD-8492
                    </span>
                    <span className="text-xs font-bold text-[#102d1f] flex items-center gap-1">
                      <Truck className="size-3.5 text-[#087a50]" />
                      Livraison Toutci
                    </span>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors ${
                      orderStatus === "prep"
                        ? "bg-amber-100 text-amber-900 border border-amber-300"
                        : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                    }`}
                  >
                    <Clock className="size-3.5" />
                    {orderStatus === "prep" ? "En préparation (12 min restantes)" : "Prête — Coursier en route"}
                  </span>
                </div>

                <div className="py-4 space-y-2">
                  <div className="flex items-center justify-between text-sm text-[#102d1f]">
                    <span className="font-semibold">2x Garba Prestige (Thon braisé + Alloco)</span>
                    <span className="font-bold">12 000 FCFA</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-[#102d1f]">
                    <span className="font-semibold">2x Jus de Bissap maison (50cl)</span>
                    <span className="font-bold">3 000 FCFA</span>
                  </div>
                  <p className="text-xs text-[#5e6e64] italic bg-[#edf5f0]/60 p-2 rounded-lg">
                    Note client : « Piment à part svp, merci ! »
                  </p>
                </div>

                <div className="pt-4 border-t border-[#dfe8e2] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="text-xs text-[#5e6e64]">
                    Total payé : <strong className="text-sm font-bold text-[#102d1f]">15 000 FCFA</strong> (Wave)
                    <span className="block text-[11px] text-[#087a50] font-medium mt-0.5">
                      Coursier assigné : Moussa K. (Arrivée estimée : 8 min)
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setOrderStatus(orderStatus === "prep" ? "ready" : "prep")}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-xs ${
                      orderStatus === "prep"
                        ? "bg-[#087a50] text-white hover:bg-[#0d3d28]"
                        : "bg-[#edf5f0] text-[#087a50] border border-[#087a50]"
                    }`}
                  >
                    {orderStatus === "prep" ? "Marquer commande prête" : "Commande marquée prête ✓"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 sm:p-8 bg-[#fbfdfb]">
              {/* Residence KPI Strip */}
              <div className="grid grid-cols-3 gap-4 mb-6 text-center">
                <div className="p-3.5 rounded-2xl bg-[#edf5f0] border border-[#dfe8e2]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#5e6e64] block">
                    Taux d’occupation
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-[#0d3d28]">
                    86 %
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#edf5f0] border border-[#dfe8e2]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#5e6e64] block">
                    Nuitées ce mois
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-[#0d3d28]">
                    24 nuits
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#edf5f0] border border-[#dfe8e2]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#5e6e64] block">
                    Revenus sécurisés
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-[#087a50]">
                    1 440 000 F
                  </span>
                </div>
              </div>

              {/* Active Booking Card */}
              <div className="rounded-2xl border-2 border-[#087a50] bg-white p-5 sm:p-6 shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#dfe8e2]">
                  <div className="flex items-center gap-2.5">
                    <span className="size-8 rounded-lg bg-[#e7f3ec] text-[#087a50] flex items-center justify-center font-bold text-xs">
                      <Building2 className="size-4" />
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-[#102d1f]">
                        Suite Présidentielle avec Balcon
                      </h4>
                      <span className="text-xs text-[#5e6e64] flex items-center gap-1">
                        <MapPin className="size-3 text-[#087a50]" />
                        Cocody Danga
                      </span>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                    <ShieldCheck className="size-3.5 text-emerald-700" />
                    Paiement 100 % garanti (Paystack)
                  </span>
                </div>

                <div className="py-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                  <div className="p-3 rounded-xl bg-[#edf5f0]/50 border border-[#dfe8e2]/60">
                    <span className="text-[10px] font-bold uppercase text-[#5e6e64] block mb-1">
                      Dates du séjour
                    </span>
                    <strong className="text-[#102d1f]">Du 19 au 22 Septembre (3 nuitées)</strong>
                    <span className="block text-xs text-[#5e6e64] mt-0.5">Arrivée prévue à 14h00</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#edf5f0]/50 border border-[#dfe8e2]/60">
                    <span className="text-[10px] font-bold uppercase text-[#5e6e64] block mb-1">
                      Voyageur certifié
                    </span>
                    <strong className="text-[#102d1f]">Dr. Stéphane K.</strong>
                    <span className="block text-xs text-[#087a50] font-medium mt-0.5">Identité validée par Toutci</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#dfe8e2] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs text-[#5e6e64]">Montant reversé : </span>
                    <strong className="text-base font-extrabold text-[#0d3d28]">180 000 FCFA</strong>
                    <span className="text-xs text-[#5e6e64]"> (déjà encaissé)</span>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <MotionButton
                      href="#tarifs"
                      label="Publier ma résidence"
                      classes="text-xs bg-white border-[#dfe8e2]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
