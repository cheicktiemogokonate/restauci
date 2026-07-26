"use client";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useRef } from "react";
import BackgroundDecoration from "./BackgroundDecoration";
import BlurText from "./BlurText";
import Magnet from "./Magnet";
import VariableProximity from "./VariableProximity";

export default function Hero() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const shouldReduceMotion = useReducedMotion();

  return (
    <section
      id="hero"
      className="relative pt-[120px] pb-[80px] overflow-hidden bg-[#FAFBFA] min-h-dvh"
    >
      {/* Background ambient glowing nodes & premium radial green glows */}
      <div
        className="absolute top-[-50px] right-[-50px] w-[600px] h-[600px] pointer-events-none -z-10"
        style={{
          background:
            "radial-gradient(circle, rgba(34,197,94,0.09) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute bottom-[-100px] -left-25 w-[600px] h-[600px] pointer-events-none -z-10"
        style={{
          background:
            "radial-gradient(circle, rgba(34,197,94,0.07) 0%, transparent 70%)",
        }}
      />

      {/* Large monochromatic food-themed line illustrations */}
      <BackgroundDecoration
        src="/backgrounds/mushroom-outline.svg"
        className="absolute top-10 -left-25 opacity-25"
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
        className="absolute top-120 -right-25 opacity-20"
        size={310}
      />
      <BackgroundDecoration
        src="/backgrounds/fork-spoon-outline.svg"
        className="absolute bottom-10 -right-15 opacity-25"
        size={280}
      />
      <BackgroundDecoration
        src="/backgrounds/tomato-outline.svg"
        className="absolute -bottom-12.5 left-[5%] opacity-20"
        size={260}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Banner/Badge Link */}
        <div className="flex justify-center mb-6">
          {/* 🔗 réintégrer quand une fonctionnalité IA réelle et livrée existe
          <motion.a
            href="#features"
            initial={shouldReduceMotion ? undefined : { opacity: 0, y: -10 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={shouldReduceMotion ? undefined : { duration: 0.4 }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-brand-green/8 border border-brand-green/20 hover:border-brand-green/45 text-brand-green text-xs font-semibold shadow-xs transition-colors"
          >
            <Sparkles className="h-3 w-3" />
            <span>
              Découvrez la version 2.4 - Intelligence Artificielle intégrée
            </span>
            <ArrowRight className="h-3.5 w-3.5" />
          </motion.a>
          */}
        </div>

        {/* Heading Panel */}
        <div
          ref={containerRef}
          className="text-center max-w-3xl mx-auto mb-14 flex flex-col items-center relative overflow-visible space-y-2 lg:mt-28"
        >
          <BlurText
            text="Découvrez, commandez"
            delay={100}
            animateBy="words"
            direction="top"
            as="h1"
            className="font-display font-extrabold text-[38px] sm:text-[52px] lg:text-[62px] tracking-tight text-brand-dark leading-[1.05] justify-center text-center"
          />
          <BlurText
            text="faites vivre votre établissement."
            delay={100}
            animateBy="words"
            direction="bottom"
            as="h2"
            className="font-display font-extrabold text-[38px] sm:text-[52px] lg:text-[62px] tracking-tight text-brand-green leading-[1.05] justify-center mb-6 text-center"
          />

          {/* <motion.p
            initial={shouldReduceMotion ? undefined : { opacity: 0, y: 20 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={
              shouldReduceMotion ? undefined : { duration: 0.5, delay: 0.1 }
            }
            className="text-xl sm:text-2xl font-display font-medium text-brand-dark mb-4 max-w-2xl mx-auto text-center"
          >
            Découvrez, commandez et faites vivre votre commerce, à Bouaké.
          </motion.p> */}

          <motion.p
            initial={shouldReduceMotion ? undefined : { opacity: 0, y: 20 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={
              shouldReduceMotion ? undefined : { duration: 0.5, delay: 0.2 }
            }
            className="text-lg sm:text-xl text-brand-dark/85 font-sans leading-relaxed mb-8 max-w-2xl mx-auto cursor-default"
          >
            <VariableProximity
              label="Toutci connecte les clients aux restaurants de Côte d’Ivoire — et donne aux restaurateurs une vitrine simple pour être trouvés et recevoir leurs commandes."
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
            transition={
              shouldReduceMotion ? undefined : { duration: 0.5, delay: 0.3 }
            }
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-4"
          >

            <Magnet
              padding={50}
              disabled={false}
              magnetStrength={15}
              wrapperClassName="w-full sm:w-auto"
              innerClassName="w-full sm:w-auto"
            >
              <a
                href="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-4 text-base font-bold text-white bg-brand-green hover:bg-[#0c734e] rounded-xl shadow-lg shadow-[#0f8a5f22] transition-all hover:-translate-y-0.5"
              >
                Devenir partenaire
                <ArrowRight className="ml-2.5 h-5 w-5" />
              </a>
            </Magnet>

            <Magnet
              padding={50}
              disabled={false}
              magnetStrength={15}
              wrapperClassName="w-full sm:w-auto"
              innerClassName="w-full sm:w-auto"
            >
              <button
                disabled
                className="w-full sm:w-auto relative inline-flex items-center justify-center px-7 py-4 text-base font-bold text-white bg-brand-green/50 cursor-not-allowed rounded-xl shadow-lg shadow-[#0f8a5f11] transition-all"
              >
                Télécharger l&apos;app
                <span className="absolute -top-3 -right-3 bg-white text-brand-dark text-[10px] font-bold px-2 py-0.5 rounded-full border border-gray-100 shadow-sm">
                  Bientôt disponible
                </span>
              </button>
            </Magnet>
          </motion.div>
        </div>

        {/* Dashboard Showcase Frame surrounded by floating state components */}
        <div className="relative mt-4 max-w-5xl mx-auto">
          {/* Background glow effect behind dashboard */}
          <div className="absolute inset-0 rounded-2xl bg-linear-to-r from-brand-green/10 via-transparent to-brand-green/5 blur-3xl -z-10 pointer-events-none" />

          {/* Main Dashboard Wrapper */}
          {/* <motion.div
            initial={shouldReduceMotion ? undefined : { opacity: 0, y: 35 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={
              shouldReduceMotion ? undefined : { duration: 0.65, delay: 0.4 }
            }
            className="rounded-2xl border border-[#E5E5E5] bg-white p-2.5 shadow-[0_20px_60px_rgba(0,0,0,0.08)] relative z-10 hover:shadow-[0_25px_70px_rgba(0,0,0,0.12)] transition-shadow duration-300"
          >
            <div className="bg-[#FAFBFA] rounded-xl border border-[#F0F0F0] overflow-hidden ring-1 ring-white/50 relative w-full aspect-video">
              <Image
                src="/hero-img.png"
                alt="Toutci App et Dashboard"
                fill
                priority
                className="object-cover"
              />
            </div>
          </motion.div> */}
        </div>
      </div>
    </section>
  );
}
