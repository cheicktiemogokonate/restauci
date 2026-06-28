"use client";
import dynamic from "next/dynamic";
import { AlertCircle, ArrowRight, Sparkles } from "lucide-react";

const Beams = dynamic(() => import("@/components/landing/ui/Beams"), { loading: () => <div /> });
import "@/components/landing/ui/Beams.css";

export default function CTA() {
  return (
    <section
      id="cta"
      className="relative py-24 bg-[#0B0F19] text-white overflow-hidden"
    >
      <div className="absolute inset-0 pointer-events-none">
        <Beams
          beamWidth={1.8}
          beamHeight={12}
          beamNumber={10}
          lightColor="#4df5d1"
          speed={1.5}
          noiseIntensity={0.9}
          scale={0.18}
          rotation={-10}
        />
      </div>
      <div className="absolute inset-0 bg-[#0B0F19]/80" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Spark decoration */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-brand-green text-xs font-semibold">
            <Sparkles className="h-3 w-3 text-brand-green" />
            <span>Offre limitée : 14 jours d&apos;essai offerts</span>
          </div>
        </div>

        {/* Large Headlines */}
        <h2 className="font-display font-black text-[38px] sm:text-[52px] lg:text-[60px] tracking-tight leading-[1.05] mb-6 max-w-3xl mx-auto">
          Votre restaurant. <br />
          <span className="text-brand-green">Toujours sous contrôle.</span>
        </h2>

        {/* Support copy */}
        <p className="text-sm sm:text-base text-white/70 max-w-lg mx-auto leading-relaxed mb-10 font-sans">
          Rejoignez les centaines d&apos;établissements qui ont supprimé le papier et
          optimisé leur rentabilité dès la première semaine.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="/restaurateur"
            className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 bg-brand-green hover:bg-[#0c734e] text-white font-bold text-base rounded-xl transition-all shadow-xl shadow-brand-green/20 hover:-translate-y-0.5"
          >
            Commencer maintenant
            <ArrowRight className="ml-2.5 h-5 w-5" />
          </a>
          {/* <a
            href="#pricing"
            className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-bold text-base rounded-xl border border-white/10 transition-all hover:-translate-y-0.5"
          >
            <Play className="mr-2 h-4 w-4 text-brand-green fill-brand-green" />
            Réserver une démo
          </a> */}
        </div>

        {/* Reassuring copy under button */}
        <div className="flex items-center justify-center gap-2 mt-8 text-[11px] text-white/50 font-semibold font-sans">
          <AlertCircle className="h-4 w-4 text-brand-green" />
          <span>
            Pas de carte de crédit requise. Installation simplifiée en 15
            minutes.
          </span>
        </div>
      </div>
    </section>
  );
}
