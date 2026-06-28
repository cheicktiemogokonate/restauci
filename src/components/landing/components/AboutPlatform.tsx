"use client";
import { formatEuro } from "@/lib/utils/format";
import { Check, ShieldCheck, Smartphone, Tablet } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import BackgroundDecoration from "./BackgroundDecoration";

export default function AboutPlatform() {
  const points = [
    {
      title: "Gestion Centralisée Universelle",
      desc: "Pilotez plusieurs franchises, points de vente ou menus saisonniers depuis un tableau de bord unique, sans ressaisie.",
    },
    {
      title: "Suivi Instantané en Temps Réel",
      desc: "Les commandes saisies par vos serveurs s'affichent instantanément en cuisine avec un indicateur d'attente précis.",
    },
    {
      title: "Accès Multi-Support sans Couture",
      desc: "Compatible avec vos tablettes Android/iPad, terminaux de poche Android, smartphones et ordinateurs de bureau.",
    },
    {
      title: "Infrastructure Cloud Ultra-Sécurisée",
      desc: "Base de données résiliente avec synchronisation hors-ligne pour continuer à prendre des commandes même en cas de panne réseau.",
    },
  ];

  const shouldReduceMotion = useReducedMotion();

  return (
    <section id="about" className="py-24 overflow-hidden relative bg-white">
      {/* Background ambient glowing nodes & premium radial green glows */}
      <div
        className="absolute top-[30%] left-[-10%] w-125 h-125 pointer-events-none -z-10 animate-pulse duration-5000"
        style={{
          background:
            "radial-gradient(circle, rgba(34,197,94,0.06) 0%, transparent 70%)",
        }}
      />

      {/* Background SVG vector decorations */}
      <BackgroundDecoration
        src="/backgrounds/pizza-outline.svg"
        className="absolute top-10 -right-35 opacity-25"
        size={360}
      />
      <BackgroundDecoration
        src="/backgrounds/herbs-outline.svg"
        className="absolute bottom-20 -left-25 opacity-30"
        size={330}
      />
      <BackgroundDecoration
        src="/backgrounds/cheese-outline.svg"
        className="absolute bottom-[10%] -right-25 opacity-25"
        size={290}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          {/* Left panel: Bullet points & descriptions */}
          <div className="lg:col-span-5 space-y-8">
            <motion.div
              initial={shouldReduceMotion ? undefined : { opacity: 0, y: 30 }}
              whileInView={
                shouldReduceMotion ? undefined : { opacity: 1, y: 0 }
              }
              viewport={{ once: true, margin: "-80px" }}
              transition={shouldReduceMotion ? undefined : { duration: 0.6 }}
            >
              <span className="text-xs font-bold text-brand-green uppercase tracking-widest block mb-3">
                L&apos;ÉCOSYSTÈME RESTAUCI
              </span>
              <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-brand-dark tracking-tight leading-[1.1] mb-6">
                Une infrastructure complète, pensée pour les restaurateurs
                réels.
              </h2>
              <p className="text-sm sm:text-base text-brand-dark/80 leading-relaxed font-sans">
                Oubliez les papiers perdus, les erreurs de communication entre
                la salle et la cuisine, et les ruptures de stocks imprévues.
                RestauCI unifie vos opérations.
              </p>
            </motion.div>

            <div className="space-y-5">
              {points.map((point, index) => (
                <motion.div
                  key={index}
                  className="flex gap-4 items-start"
                  initial={
                    shouldReduceMotion ? undefined : { opacity: 0, x: -25 }
                  }
                  whileInView={
                    shouldReduceMotion ? undefined : { opacity: 1, x: 0 }
                  }
                  viewport={{ once: true }}
                  transition={
                    shouldReduceMotion
                      ? undefined
                      : { duration: 0.5, delay: index * 0.12 }
                  }
                >
                  <div className="shrink-0 w-6 h-6 rounded-full bg-brand-green/10 text-brand-green flex items-center justify-center mt-1">
                    <Check className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-sm text-brand-dark">
                      {point.title}
                    </h4>
                    <p className="text-xs text-brand-dark/80 mt-1 font-sans leading-relaxed">
                      {point.desc}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right panel: Side-by-side device simulation (Tablet & Mobile overlap layout) */}
          <div className="lg:col-span-7 relative flex justify-center py-8">
            {/* Background glowing gradient ball */}
            <div className="absolute top-[20%] left-[30%] w-75 h-75 bg-brand-green/5 rounded-full blur-[80px] -z-10 pointer-events-none" />

            {/* Simulated Desktop/Tablet panel mockup */}
            <motion.div
              className="bg-[#FAFBFA] w-full max-w-130 rounded-2xl border border-gray-200/50 p-2 shadow-2xl relative z-10 transition-transform hover:scale-[1.01] duration-300"
              initial={
                shouldReduceMotion
                  ? undefined
                  : { opacity: 0, scale: 0.95, y: 40 }
              }
              whileInView={
                shouldReduceMotion ? undefined : { opacity: 1, scale: 1, y: 0 }
              }
              viewport={{ once: true, margin: "-60px" }}
              transition={
                shouldReduceMotion
                  ? undefined
                  : { type: "spring", damping: 25, stiffness: 100, delay: 0.1 }
              }
            >
              <div className="bg-white rounded-xl overflow-hidden border border-gray-250/30">
                {/* Simulated Header */}
                <div className="bg-gray-100/90 px-4 py-2.5 flex items-center justify-between border-b border-gray-200/50">
                  <div className="flex items-center gap-1.5">
                    <Tablet className="h-4 w-4 text-emerald-600" />
                    <span className="text-[10px] font-mono font-bold text-brand-dark/60">
                      RestauCI Terminal • Cuisine #1
                    </span>
                  </div>
                  <div className="flex h-2 w-2 rounded-full bg-emerald-500" />
                </div>

                {/* Simulated Monitor Screen Content */}
                <div className="p-4 space-y-3 bg-white">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <span className="text-[11px] font-bold text-brand-dark flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3 text-emerald-600" />
                      Commandes actives connectées
                    </span>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-500/15 font-semibold">
                      Sync OK
                    </span>
                  </div>

                  {/* Cooking ticket rows */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-gray-50/50 p-2.5 rounded-lg border border-gray-200/40">
                      <div className="flex justify-between items-center text-[10px] mb-1">
                        <span className="font-bold text-brand-dark/75">
                          Table 8
                        </span>
                        <span className="text-amber-600 font-bold font-mono">
                          11 min
                        </span>
                      </div>
                      <p className="text-xs text-brand-dark font-semibold truncate">
                        1x Filet de Saumon
                      </p>
                      <p className="text-xs text-brand-dark/60 truncate">
                        1x Frites maison
                      </p>
                      <span className="text-[9px] text-brand-dark/45 block mt-2 font-mono">
                        Saisi par : Sarah L.
                      </span>
                    </div>

                    <div className="bg-emerald-500/5 p-2.5 rounded-lg border border-emerald-555/15">
                      <div className="flex justify-between items-center text-[10px] mb-1">
                        <span className="font-bold text-brand-dark/75">
                          Table 11
                        </span>
                        <span className="text-emerald-600 font-bold font-mono">
                          2 min
                        </span>
                      </div>
                      <p className="text-xs text-brand-dark font-semibold truncate">
                        2x Double Burgers
                      </p>
                      <p className="text-xs text-brand-dark/60 truncate">
                        1x Salade César
                      </p>
                      <span className="text-[9px] text-emerald-600 block mt-2 font-bold font-sans">
                        Prêt pour envoi
                      </span>
                    </div>
                  </div>

                  {/* Mini-chart representation row */}
                  <div className="bg-gray-50/50 p-3 rounded-lg border border-gray-200/40 flex justify-between items-center mt-3">
                    <div className="space-y-0.5 min-w-0 pr-2">
                      <span className="text-[10px] text-brand-dark/50 font-bold uppercase block">
                        Débit Moyen
                      </span>
                      <span className="text-xs sm:text-sm font-extrabold text-brand-dark truncate block">
                        12.5 min par commande
                      </span>
                    </div>
                    <div className="flex items-end gap-1 h-6 shrink-0">
                      <div className="w-1.5 h-3 bg-gray-200 rounded-xs" />
                      <div className="w-1.5 h-4 bg-gray-200 rounded-xs" />
                      <div className="w-1.5 h-6 bg-emerald-500 rounded-xs" />
                      <div className="w-1.5 h-5 bg-emerald-555 rounded-xs" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Overlapping Mobile perspective screen mockup to show "Multi-device" */}
            <motion.div
              className=" -bottom-8 -right-4 md:right-4 w-53 h-95 bg-[#0F172A] rounded-[38px] p-1.5 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.50)] z-20 border border-slate-700/60 ring-4 ring-slate-900/40 relative select-none"
              initial={
                shouldReduceMotion
                  ? undefined
                  : { opacity: 0, scale: 0.9, x: 35, y: 35 }
              }
              whileInView={
                shouldReduceMotion
                  ? undefined
                  : { opacity: 1, scale: 1, x: 0, y: 0 }
              }
              viewport={{ once: true, margin: "-60px" }}
              transition={
                shouldReduceMotion
                  ? undefined
                  : { type: "spring", damping: 20, stiffness: 100, delay: 0.35 }
              }
              whileHover={
                shouldReduceMotion ? undefined : { scale: 1.05, y: -5 }
              }
            >
              {/* iPhone 15 Hardware Buttons Detail */}
              {/* Left Side: Ring/Silent Switch & Volume Buttons */}
              <div className="absolute -left-0.5 top-16 w-0.5 h-4 bg-slate-700/80 rounded-l-xs" />
              <div className="absolute -left-0.5 top-22.5 w-0.5.5 h-10 bg-slate-705 rounded-l-xs" />
              <div className="absolute -left-0.5 top-35 w-0.5.5 h-10 bg-slate-705 rounded-l-xs" />
              {/* Right Side: Power/Side Button */}
              <div className="absolute -right-0.5 top-27.5 w-0.5 h-12 bg-slate-705 rounded-r-xs" />

              {/* iPhone Screen Container */}
              <div className="bg-white rounded-[32px] p-3 text-brand-dark overflow-hidden h-full flex flex-col justify-between relative shadow-inner border border-gray-150/40 pt-7">
                {/* Dynamic Island pill-shaped camera notch */}
                <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-18 h-4.5 bg-black rounded-full z-50 flex items-center justify-between px-2.5 shadow-md">
                  {/* Camera lens dot visualizer inside dynamic island */}
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-900/60 border border-slate-800/20" />
                  <div className="w-1 h-1 rounded-full bg-blue-950/40 ml-auto" />
                </div>

                {/* iPhone 15 Top Status Bar Layout */}
                <div className="absolute top-1.5 left-0 right-0 px-4.5 flex justify-between items-center text-[8.5px] font-sans font-semibold text-brand-dark/80 select-none z-40">
                  {/* Time indicator on the left */}
                  <span className="tracking-tight">09:41</span>

                  {/* Wireless, Signal and Battery indicator on the right */}
                  <div className="flex items-center gap-1">
                    {/* Signal bars */}
                    <svg
                      className="w-2.5 h-2"
                      viewBox="0 0 10 8"
                      fill="currentColor"
                    >
                      <rect x="0" y="6" width="1.5" height="2" rx="0.3" />
                      <rect x="2" y="4" width="1.5" height="4" rx="0.3" />
                      <rect x="4" y="2" width="1.5" height="6" rx="0.3" />
                      <rect x="6" y="0" width="1.5" height="8" rx="0.3" />
                    </svg>
                    {/* WiFi logo */}
                    <svg
                      className="w-2.5 h-2"
                      viewBox="0 0 10 8"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                    >
                      <path d="M1 2.5C3.5 .5 6.5 .5 9 2.5" />
                      <path d="M2.5 4.5C4.5 3 5.5 3 7.5 4.5" />
                      <circle
                        cx="5"
                        cy="6.5"
                        r="0.8"
                        fill="currentColor"
                        stroke="none"
                      />
                    </svg>
                    {/* iOS style Battery icon */}
                    <div className="w-4 h-2 border border-brand-dark/70 rounded-xs p-[0.5px] flex items-center relative">
                      <div className="h-full w-[85%] bg-brand-dark/90 rounded-2xs" />
                      <div className="absolute -right-0.5 top-0.5 w-px h-1 bg-brand-dark/70 rounded-r-xs" />
                    </div>
                  </div>
                </div>

                {/* Mobile App View Header */}
                <div className="flex justify-between items-center pb-2 border-b border-gray-100 text-[9px] text-brand-dark/40 pt-1">
                  <div className="flex items-center gap-1 font-mono font-medium">
                    <Smartphone className="h-2.5 w-2.5 text-emerald-600" />
                    <span className="text-gray-500 font-sans tracking-wide">
                      RestauCI Mobile
                    </span>
                  </div>
                  <div className="flex h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
                </div>

                {/* Mobile Main Body */}
                <div className="space-y-2 py-1.5 flex-1 flex flex-col justify-center">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-extrabold text-brand-dark tracking-tight">
                      Aperçu Ventes
                    </span>
                    <span className="text-[8.5px] bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                      Aujourd'hui
                    </span>
                  </div>

                  {/* Huge Stat */}
                  <div className="bg-emerald-50/50 border border-emerald-500/10 p-2 rounded-xl text-center shadow-xs">
                    <h6 className="text-[8px] text-brand-dark/50 font-bold tracking-wider uppercase font-sans">
                      Chiffre d'Affaires
                    </h6>
                    <h4 className="text-base font-mono font-extrabold text-emerald-600 mt-0.5">
                      {formatEuro(1425.8)}
                    </h4>
                  </div>

                  {/* Status checklist rows */}
                  <div className="space-y-1 text-[9px]">
                    <div className="flex justify-between border-b border-gray-50 pb-1">
                      <span className="text-brand-dark/50">Total paniers</span>
                      <span className="font-bold text-brand-dark font-mono">
                        54 repas
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-gray-50 pb-1">
                      <span className="text-brand-dark/50">Panier moyen</span>
                      <span className="font-bold text-brand-dark font-mono">
                        {formatEuro(26.4)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-brand-dark/50">Livraisons</span>
                      <span className="font-bold text-emerald-600 font-mono">
                        3 coursiers
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Section & Swipe Bar of iOS */}
                <div className="mt-auto space-y-1">
                  <div className="text-center pt-1.5 border-t border-gray-100 text-[8px] text-brand-dark/40 flex items-center justify-center gap-1 font-semibold">
                    <span className="uppercase tracking-widest text-[6.5px] text-gray-400">
                      Sync • Temps Réel
                    </span>
                  </div>

                  {/* iPhone iOS Home Swipe Indicator bar */}
                  <div className="w-16 h-0.75 bg-gray-300 rounded-full mx-auto mt-2 mb-0.5" />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
