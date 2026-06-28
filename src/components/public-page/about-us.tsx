import { Restaurant } from "@/types";
import { Sparkles } from "lucide-react";
import { motion } from "motion/react";

interface AboutUsProps {
  restaurant: Restaurant;
}

export default function AboutUs({ restaurant }: AboutUsProps) {
  return (
    <section
      id="restaurants"
      className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
    >
      <div className="flex flex-col lg:flex-row items-center gap-6">
        {/* Texts Left Side */}
        <div className="lg:col-span-6 space-y-6">
          <div className="space-y-3">
            <span className="text-xs uppercase font-extrabold text-[#0b663b] tracking-widest flex items-center gap-1.5">
              <span className=" bg-[#0b663b] inline-block" />À propos de nous
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-950 font-serif leading-tight">
              {restaurant.nom}
            </h2>
          </div>

          {restaurant.description ? (
            <p className="text-sm sm:text-base text-gray-500 font-light leading-relaxed">
              {restaurant.description}
            </p>
          ) : (
            <p className="text-sm sm:text-base text-gray-500 font-light leading-relaxed">
              Bienvenue chez {restaurant.nom}. Découvrez notre cuisine et nos
              saveurs uniques.
            </p>
          )}

          {restaurant.cuisines && restaurant.cuisines.length > 0 && (
            <p className="text-sm text-gray-400 font-light leading-relaxed">
              Spécialités : {restaurant.cuisines.join(", ")}
            </p>
          )}
        </div>

        {/* Brand Image Right Side */}
        <div className="lg:col-span-6">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative rounded-3xl overflow-hidden shadow-2xl group border border-gray-100"
          >
            {/* Front storefront photo */}
            <img
              src="/assets/images/restaurant_exterior_night_1781800314693.jpg"
              alt={`${restaurant.nom} facade`}
              className="w-full aspect-video md:aspect-4/3 object-cover group-hover:scale-[1.03] transition duration-700 select-none"
              referrerPolicy="no-referrer"
            />
            {/* Ambient vignette accent glow overlay */}
            <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition duration-500" />

            {/* Overlay tag */}
            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl text-xs font-semibold text-gray-900 border border-gray-100/30 flex items-center gap-1.5 shadow-md">
              <Sparkles className="h-3.5 w-3.5 text-[#0b663b]" />
              <span>Plats cuisinés minute</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
