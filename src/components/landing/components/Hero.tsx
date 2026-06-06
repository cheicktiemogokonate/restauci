"use client";
import { useRef } from "react";
import { ArrowRight, Play, Sparkles, TrendingUp, ShoppingBag, Clock, Users } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import InteractiveDashboard from "./InteractiveDashboard";
import BackgroundDecoration from "./BackgroundDecoration";
import BlurText from "./BlurText";
import VariableProximity from "./VariableProximity";
import Magnet from "./Magnet";

export default function Hero() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="relative pt-[120px] pb-[80px] overflow-hidden bg-[#FAFBFA]">
      
      {/* Background ambient glowing nodes & premium radial green glows */}
      <div 
        className="absolute top-[-50px] right-[-50px] w-[600px] h-[600px] pointer-events-none -z-10"
        style={{ background: "radial-gradient(circle, rgba(34,197,94,0.09) 0%, transparent 70%)" }}
      />
      <div 
        className="absolute bottom-[-100px] left-[-100px] w-[600px] h-[600px] pointer-events-none -z-10"
        style={{ background: "radial-gradient(circle, rgba(34,197,94,0.07) 0%, transparent 70%)" }}
      />
      
      {/* Large monochromatic food-themed line illustrations */}
      <BackgroundDecoration 
        src="/backgrounds/mushroom-outline.svg" 
        className="absolute top-10 left-[-100px] opacity-25"
        size={350}
      />
      <BackgroundDecoration 
        src="/backgrounds/pizza-outline.svg" 
        className="absolute top-40 right-[-120px] opacity-20"
        size={380}
      />
      <BackgroundDecoration 
        src="/backgrounds/coffee-outline.svg" 
        className="absolute top-[550px] left-[-95px] opacity-20"
        size={290}
      />
      <BackgroundDecoration 
        src="/backgrounds/burger-outline.svg" 
        className="absolute top-[480px] right-[-100px] opacity-20"
        size={310}
      />
      <BackgroundDecoration 
        src="/backgrounds/fork-spoon-outline.svg" 
        className="absolute bottom-10 right-[-60px] opacity-25"
        size={280}
      />
      <BackgroundDecoration 
        src="/backgrounds/tomato-outline.svg" 
        className="absolute bottom-[-50px] left-[5%] opacity-20"
        size={260}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Banner/Badge Link */}
        <div className="flex justify-center mb-6">
          <motion.a 
            href="#features"
            initial={shouldReduceMotion ? undefined : { opacity: 0, y: -10 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={shouldReduceMotion ? undefined : { duration: 0.4 }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-brand-green/8 border border-brand-green/20 hover:border-brand-green/45 text-brand-green text-xs font-semibold shadow-xs transition-colors"
          >
            <Sparkles className="h-3 w-3" />
            <span>Découvrez la version 2.4 - Intelligence Artificielle intégrée</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </motion.a>
        </div>

        {/* Heading Panel */}
        <div ref={containerRef} className="text-center max-w-3xl mx-auto mb-14 flex flex-col items-center relative overflow-visible">
          <BlurText
            text="Gérez votre restaurant"
            delay={100}
            animateBy="words"
            direction="top"
            as="h1"
            className="font-display font-extrabold text-[40px] sm:text-[54px] lg:text-[64px] tracking-tight text-brand-dark leading-[1.05] justify-center text-center"
          />
          <BlurText
            text="sans perdre de temps"
            delay={100}
            animateBy="words"
            direction="bottom"
            as="h2"
            className="font-display font-extrabold text-[40px] sm:text-[54px] lg:text-[64px] tracking-tight text-brand-green leading-[1.05] justify-center mt-2 mb-6 text-center"
          />

          <motion.p 
            initial={shouldReduceMotion ? undefined : { opacity: 0, y: 20 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={shouldReduceMotion ? undefined : { duration: 0.5, delay: 0.2 }}
            className="text-lg sm:text-xl text-brand-dark/85 font-sans leading-relaxed mb-8 max-w-2xl mx-auto cursor-default"
          >
            <VariableProximity
              label="Centralisez commandes, menus, stocks, réservations et statistiques dans une seule plateforme intelligente et intuitive."
              className="text-lg sm:text-xl text-brand-dark/70 font-sans leading-relaxed"
              fromFontVariationSettings="'wght' 400, 'opsz' 9"
              toFontVariationSettings="'wght' 800, 'opsz' 40"
              containerRef={containerRef}
              radius={100}
              falloff="linear"
            />
          </motion.p>

          <motion.div 
            initial={shouldReduceMotion ? undefined : { opacity: 0, y: 20 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={shouldReduceMotion ? undefined : { duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Magnet padding={50} disabled={false} magnetStrength={15} wrapperClassName="w-full sm:w-auto" innerClassName="w-full sm:w-auto">
              <a 
                href="#pricing" 
                className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-4 text-base font-bold text-white bg-brand-green hover:bg-[#0c734e] rounded-xl shadow-lg shadow-[#0f8a5f22] transition-all hover:-translate-y-[2px]"
              >
                Essayer gratuitement
                <ArrowRight className="ml-2.5 h-5 w-5" />
              </a>
            </Magnet>
            <a 
              href="#showcase" 
              className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-4 text-base font-bold text-brand-dark bg-white hover:bg-gray-50 rounded-xl border border-brand-border shadow-xs transition-all hover:-translate-y-[2px]"
            >
              <Play className="mr-2 h-4 w-4 text-brand-green fill-brand-green" />
              Demander une démo
            </a>
          </motion.div>
        </div>

        {/* Dashboard Showcase Frame surrounded by floating state components */}
        <div className="relative mt-4 max-w-5xl mx-auto">
          
          {/* Background glow effect behind dashboard */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-brand-green/10 via-transparent to-brand-green/5 blur-3xl -z-10 pointer-events-none" />
          
          {/* Main Dashboard Wrapper */}
          <motion.div
            initial={shouldReduceMotion ? undefined : { opacity: 0, y: 35 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={shouldReduceMotion ? undefined : { duration: 0.65, delay: 0.4 }}
            className="rounded-2xl border border-[#E5E5E5] bg-white p-2.5 shadow-[0_20px_60px_rgba(0,0,0,0.08)] relative z-10 hover:shadow-[0_25px_70px_rgba(0,0,0,0.12)] transition-shadow duration-300"
          >
            <div className="bg-[#FAFBFA] rounded-xl border border-[#F0F0F0] overflow-hidden ring-1 ring-white/50">
              {/* Window Controls Bar */}
              <div className="bg-gradient-to-r from-gray-100/80 to-gray-50/80 px-4 py-3 flex items-center justify-between border-b border-gray-200/60">
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-400/90 shadow-sm" />
                  <span className="w-3 h-3 rounded-full bg-yellow-400/90 shadow-sm" />
                  <span className="w-3 h-3 rounded-full bg-green-400/90 shadow-sm" />
                </div>
                <div className="text-xs text-brand-dark/60 bg-white/50 border border-gray-200/40 px-3 py-0.5 rounded-md font-mono font-medium truncate max-w-xs sm:max-w-md hover:bg-white/80 transition-colors">
                  app.restauci.com/workspace/dashboard
                </div>
                <div className="w-12" /> {/* Balancing spacing */}
              </div>

              {/* The living dashboard console */}
              <InteractiveDashboard />
            </div>
          </motion.div>
        </div>

      </div>
    </section>
  );
}
