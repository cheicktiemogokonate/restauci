"use client";

import { motion } from "framer-motion";
import { ArrowDown, } from "lucide-react";
import { Highlight } from "@/components/ui/hero-highlight";

export function PartnerHero() {
  return (
    <section className="relative min-h-dvh flex flex-col justify-center items-center pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden bg-transparent">
      {/* Ambient background glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[w-175 sm:w-225 h-100 pointer-events-none -z-10 blur-3xl opacity-60"
        style={{
          background:
            "radial-gradient(circle, rgba(19, 185, 129, 0.22) 0%, rgba(13, 61, 40, 0.06) 50%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center justify-center">
        {/* Hero Headline with Highlight */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.6,
            ease: [0.16, 1, 0.3, 1],
            delay: 0.1,
          }}
          className="font-heading font-black text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-[5.25rem] text-[#102d1f] dark:text-white tracking-[-0.035em] leading-[1.14] sm:leading-[1.08] mb-8 sm:mb-12"
        >
          Développez la visibilité et les revenus de votre{" "}
          <Highlight className="text-[#0d3d28] dark:text-emerald-100 bg-gradient-to-r from-[#86efac]/90 via-[#5ee5ad] to-[#34d399]/85 dark:from-[#087a50] dark:to-[#10b981] px-2.5 sm:px-5 py-0.5 sm:py-1 rounded-xl sm:rounded-3xl shadow-sm inline-block">
            Établissement
          </Highlight>
        </motion.h1>

        {/* Shortened & punchy subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.6,
            ease: [0.16, 1, 0.3, 1],
            delay: 0.2,
          }}
          className="text-base sm:text-lg md:text-xl lg:text-2xl text-[#102d1f]/80 dark:text-neutral-300 leading-relaxed max-w-xl sm:max-w-2xl mx-auto mb-10 sm:mb-14 font-medium"
        >
          Rejoignez l’écosystème Toutci : commissions maîtrisées, gestion simplifiée et paiements 100% sécurisés.
        </motion.p>

        {/* Call to action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.6,
            ease: [0.16, 1, 0.3, 1],
            delay: 0.3,
          }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto"
        >
          <a href="#activites" className="scroll-cue">Découvrir <ArrowDown size={15} strokeWidth={2} /></a>
        </motion.div>
      </div>
    </section>
  );
}
