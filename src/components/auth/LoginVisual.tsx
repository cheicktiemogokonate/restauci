import React from "react";
import { motion } from "motion/react";
import {
  Activity,
  ClipboardList,
  Grid,
  TrendingUp,
  Bell,
  Quote,
  Star,
} from "lucide-react";
import { LoginFeatureBadge } from "./types";

interface LoginVisualProps {
  loginFeatureBadges: LoginFeatureBadge[];
}

export default function LoginVisual({ loginFeatureBadges }: LoginVisualProps) {
  return (
    <motion.div
      key="login-visual"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.35 }}
      className="h-full flex flex-col justify-between"
    >
      {/* High Quality Backdrop Chef Painting at service counter */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&q=80&w=800"
          alt="Premium Culinary Chef"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover brightness-[0.78]"
        />
        {/* Rich deep cinematic dark-green linear gradients overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-[#02110a]/92 via-transparent to-black/20" />
      </div>

      {/* Overlays Wrapper Container */}
      <div className="relative inset-0 flex flex-col justify-between h-full z-10 p-5.5">
        
        {/* TOP RIGHT OVERLAY CARD: LIVE OPERATIONAL STATS PANELS */}
        <div className="w-full flex justify-end">
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-[#042114]/94 backdrop-blur-md rounded-2.5xl p-5 border border-emerald-500/15 text-white shadow-xl max-w-[340px] w-full mt-2"
          >
            {/* Header metadata row */}
            <div className="flex items-start gap-3 mb-4.5 select-none text-emerald-400">
              <div className="h-9.5 w-9.5 rounded-full bg-emerald-950/70 border border-emerald-800/40 flex items-center justify-center">
                <Activity className="h-4.5 w-4.5 text-emerald-400" />
              </div>
              <div className="flex-1 leading-tight">
                <h4 className="text-[12.5px] font-extrabold text-white tracking-wide">
                  Pilotez. Analysez. Développez.
                </h4>
                <p className="text-[10px] text-white/55 font-medium mt-0.5">
                  Toutes vos opérations au même endroit.
                </p>
              </div>
            </div>

            {/* Separator line style */}
            <div className="border-t border-emerald-500/10 mb-3.5" />

            {/* Metric Row listings */}
            <div className="space-y-3.5 select-none">
              <div className="flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-2.5 text-white/80">
                  <ClipboardList className="h-4 w-4 text-emerald-500/80" />
                  <span>Commandes aujourd'hui</span>
                </div>
                <span className="text-[#0F8A5F] font-black text-sm">128</span>
              </div>

              <div className="flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-2.5 text-white/80">
                  <Grid className="h-4 w-4 text-emerald-500/80" />
                  <span>Tables occupées</span>
                </div>
                <span className="text-[#0F8A5F] font-black text-sm">24</span>
              </div>

              <div className="flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-2.5 text-white/80">
                  <TrendingUp className="h-4 w-4 text-emerald-500/80" />
                  <span>Chiffre d'affaires</span>
                </div>
                <span className="text-[#0F8A5F] font-black text-sm">2 450 €</span>
              </div>

              <div className="flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-2.5 text-white/80">
                  <Bell className="h-4 w-4 text-emerald-500/80" />
                  <span>Alertes de stock</span>
                </div>
                <span className="text-[#0F8A5F] font-black text-sm">3</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* BOTTOM LEFT OVERLAY CARD: COPPY TESTIMONIAL QUOTE */}
        <div className="w-full flex justify-start relative">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-[#042114]/94 backdrop-blur-md rounded-2.5xl p-5 border border-emerald-500/15 text-white shadow-xl max-w-[340px] w-full relative mb-1.5"
          >
            {/* Hanging floating quote bubble badge */}
            <div className="absolute top-0 left-5 -translate-y-1/2 h-8.5 w-8.5 rounded-full bg-[#0F8A5F] border border-emerald-500/30 flex items-center justify-center text-white shadow-md">
              <Quote className="h-4 w-4 text-white fill-white" />
            </div>

            {/* Testimonial speech line */}
            <p className="text-[11.5px] leading-relaxed text-white/90 font-medium pt-1">
              "RestauCI nous a permis de gagner en efficacité et d'offrir une meilleure expérience à nos clients."
            </p>

            {/* User author profile row */}
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2.5">
                <img
                  src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=80"
                  alt="Sarah L."
                  className="h-8.5 w-8.5 rounded-full object-cover border border-emerald-500/20 shadow-xs"
                />
                <div className="leading-tight">
                  <span className="text-xs font-extrabold text-white block">Sarah L.</span>
                  <span className="text-[10px] text-white/60 font-semibold block mt-0.5">Gérante - Bistro Gourmet</span>
                </div>
              </div>

              {/* Ratings stars matching photo illustration */}
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="h-3.5 w-3.5 fill-[#EFA41F] text-[#EFA41F]" />
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* LOWER HORIZONTAL DARK BAR: CORE DOCK KEY FEATURES */}
      <div className="w-full bg-[#02100A] py-5 px-4.5 border-t border-emerald-950 grid grid-cols-4 gap-2 z-10 shrink-0 text-center select-none">
        {loginFeatureBadges.map((badge, idx) => (
          <div key={idx} className="flex flex-col items-center">
            {/* Custom Round green badge for Icon outline */}
            <div className="h-8 w-8 rounded-full bg-[#0F8A5F]/10 border border-[#0F8A5F]/20 flex items-center justify-center mb-2.5 text-emerald-400">
              <badge.icon className="h-4 w-4" />
            </div>

            <h5 className="text-[10.5px] font-extrabold text-white/95 leading-snug tracking-tight">
              {badge.title}
            </h5>

            <div className="text-[9px] text-white/55 font-medium mt-1 leading-tight space-y-0.5">
              {badge.lines.map((line, lIdx) => (
                <span key={lIdx} className="block">
                  {line}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
