"use client";
import { Zap, Trash2, Heart, TrendingUp } from "lucide-react";
import { benefitsData } from "../data";
import PixelCard from "./PixelCard";
import { motion, useReducedMotion } from "motion/react";

export default function Benefits() {
  
  const renderIcon = (iconName: string) => {
    const props = { className: "h-6 w-6 text-brand-green" };
    switch (iconName) {
      case "Zap":
        return <Zap {...props} />;
      case "Trash2":
        return <Trash2 {...props} />;
      case "Heart":
        return <Heart {...props} />;
      case "TrendingUp":
        return <TrendingUp {...props} />;
      default:
        return <Zap {...props} />;
    }
  };

  const shouldReduceMotion = useReducedMotion();

  return (
    <section id="benefits" className="py-24 bg-white border-y border-[#EAEAEA] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Caption panel tag */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold text-brand-green uppercase tracking-widest block mb-3">
            AVANTAGES CONCRETS
          </span>
          <h2 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-brand-dark tracking-tight leading-[1.15] mb-6">
            Optimisez chaque aspect de votre service.
          </h2>
          <p className="text-sm sm:text-base text-brand-dark/80 font-sans leading-relaxed max-w-2xl mx-auto">
            Nos statistiques prouvent l&apos;apport direct de RestauCI auprès de plus de 800 restaurants partenaires à travers l&apos;Europe.
          </p>
        </div>

        {/* 4 columns layout of benefits with PixelCards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {benefitsData.map((benefit, i) => (
            <motion.div
              key={benefit.id}
              initial={shouldReduceMotion ? undefined : { opacity: 0, y: 30 }}
              whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={shouldReduceMotion ? undefined : { duration: 0.5, delay: i * 0.1 }}
            >
              <PixelCard 
                variant="default"
                speed={35}
                gap={7}
                className="group p-6 bg-[#fafbfa] rounded-2xl border border-[#FAFBFA] hover:border-brand-green/20 hover:bg-white transition-all duration-300 shadow-xs h-full"
              >
                <div className="w-12 h-12 rounded-xl bg-brand-green/8 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-300 border border-brand-green/5">
                  {renderIcon(benefit.iconName)}
                </div>
                
                <h3 className="font-display font-bold text-base text-brand-dark mb-3">
                  {benefit.title}
                </h3>
                
                <p className="text-xs sm:text-sm text-brand-dark/75 font-sans leading-relaxed">
                  {benefit.description}
                </p>
              </PixelCard>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}

