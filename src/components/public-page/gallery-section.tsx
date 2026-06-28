import { formatPrix } from "@/lib/utils/format";
import { ChevronLeft, ChevronRight, ImageIcon, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import React, { useState } from "react";
import { Dish } from "../types";

interface GallerySectionProps {
  onOpenMenu: () => void;
  dishes: Dish[];
}

const IMAGES = [
  {
    url: "/assets/images/hero_bg_1781800187268.jpg",
    title: "Salle de Restauration intérieure chaleureuse",
  },
  {
    url: "/assets/images/dish_attieke_fish_1781800200640.jpg",
    title: "Attiéké Poisson Braisé traditionnel ivoirien",
  },
  {
    url: "/assets/images/gallery_drinks_1781800241740.jpg",
    title: "Boissons artisanales (Bissap, Gingembre, Cocktail)",
  },
  {
    url: "/assets/images/dish_placali_gumbo_1781800212574.jpg",
    title: "Placali et sa succulente Sauce Gombo royale",
  },
  {
    url: "/assets/images/gallery_patio_1781800255866.jpg",
    title: "Notre terrasse tropicale sous les guirlandes lumineuses",
  },
  {
    url: "/assets/images/gallery_grilled_meat_1781800289088.jpg",
    title: "Assiette Gourmande de Brochettes et Choukouya",
  },
];

export default function GallerySection({
  onOpenMenu,
  dishes,
}: GallerySectionProps) {
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);

  // Use popular dishes from DB; fall back to first 3 available dishes if none are popular
  const popularDishes = dishes.filter((d) => d.isPopular).slice(0, 3);
  const displayDishes =
    popularDishes.length > 0 ? popularDishes : dishes.slice(0, 3);

  const prevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activePhotoIndex !== null) {
      setActivePhotoIndex(
        (activePhotoIndex - 1 + IMAGES.length) % IMAGES.length,
      );
    }
  };

  const nextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activePhotoIndex !== null) {
      setActivePhotoIndex((activePhotoIndex + 1) % IMAGES.length);
    }
  };

  return (
    <section
      id="menus"
      className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
        {/* Gallery Column (7 of 12 fields) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-3">
            <span className="text-xs uppercase font-extrabold text-[#0b663b] tracking-widest flex items-center gap-1.5">
              <span className="w-6 h-0.5 bg-[#0b663b] inline-block" />
              Galerie
            </span>
            <h3 className="text-2xl sm:text-3xl font-serif font-extrabold text-gray-950">
              Notre ambiance en images
            </h3>
          </div>

          {/* Photo Grid - 3x2 rounded layout */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {IMAGES.map((img, idx) => (
              <motion.div
                key={idx}
                whileHover={{ y: -4, scale: 1.02 }}
                onClick={() => setActivePhotoIndex(idx)}
                className="relative aspect-square rounded-2xl overflow-hidden shadow-xs cursor-pointer group border border-gray-100"
              >
                <img
                  src={img.url}
                  alt={img.title}
                  className="w-full h-full object-cover group-hover:scale-105 duration-500 select-none"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition duration-300 flex items-center justify-center">
                  <span className="bg-white/90 text-gray-950 text-xs px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-md">
                    <ImageIcon className="h-3.5 w-3.5 text-[#0b663b]" />
                    <span>Zoomer</span>
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* View gallery control pill */}
          <div className="pt-2 text-center sm:text-left">
            <button
              onClick={() => setActivePhotoIndex(0)}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-6 py-3 text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 active:scale-[0.98] transition cursor-pointer"
            >
              <ImageIcon className="h-4 w-4 text-[#0b663b]" />
              Voir plus de photos
            </button>
          </div>
        </div>

        {/* Popular Dishes Column (5 of 12 fields) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-3">
            <span className="text-xs uppercase font-extrabold text-[#e2b34a] tracking-widest flex items-center gap-1.5">
              <span className="w-6 h-0.5 bg-[#e2b34a] inline-block" />
              Chef Suggestions
            </span>
            <h3 className="text-2xl sm:text-3xl font-serif font-extrabold text-gray-950">
              Plats populaires
            </h3>
          </div>

          {/* List of dishes from DB */}
          <div className="space-y-4">
            {displayDishes.length > 0 ? (
              displayDishes.map((dish) => (
                <div
                  key={dish.id}
                  className="bg-white rounded-2xl border border-gray-100/80 p-4 shadow-xs flex items-center gap-4 hover:shadow-md transition hover:border-[#0b663b]/10 group"
                >
                  {/* Image */}
                  <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl overflow-hidden bg-gray-50 shrink-0">
                    <img
                      src={dish.image}
                      alt={dish.name}
                      className="h-full w-full object-cover group-hover:scale-105 transition duration-500"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "/assets/images/hero_bg_1781800187268.jpg";
                      }}
                    />
                  </div>

                  {/* Text and price */}
                  <div className="flex-1 flex flex-col justify-center">
                    <div className="flex justify-between items-start gap-3">
                      <h4 className="font-bold text-gray-950 text-sm group-hover:text-[#0b663b] transition leading-tight">
                        {dish.name}
                      </h4>
                      <span className="font-bold text-[#0b663b] text-xs sm:text-sm whitespace-nowrap">
                        {formatPrix(dish.price)}
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-gray-400 font-light leading-snug mt-1.5 line-clamp-2">
                      {dish.description}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400 font-light py-4 text-center">
                Aucun plat disponible pour le moment.
              </p>
            )}
          </div>

          {/* View Menu full button */}
          <div className="pt-2 text-center lg:text-left">
            <button
              onClick={onOpenMenu}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-gray-200 px-6 py-3 text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 active:scale-[0.98] transition cursor-pointer"
            >
              Voir tout le menu
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {activePhotoIndex !== null && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActivePhotoIndex(null)}
              className="fixed inset-0 bg-black/90 backdrop-blur-md"
            />

            {/* Lightbox frame */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-4xl max-h-[75vh] w-full flex items-center justify-center z-10"
            >
              {/* Close button */}
              <button
                onClick={() => setActivePhotoIndex(null)}
                className="absolute -top-12 right-0 bg-white/10 text-white/90 p-2.5 rounded-full hover:bg-white/20 hover:text-white transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Prev */}
              <button
                onClick={prevPhoto}
                className="absolute left-2 sm:-left-16 bg-white/15 text-white/95 hover:bg-white/25 p-3 rounded-full backdrop-blur-sm transition cursor-pointer"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>

              <img
                src={IMAGES[activePhotoIndex].url}
                alt={IMAGES[activePhotoIndex].title}
                className="max-w-full max-h-[75vh] object-contain rounded-2xl select-none"
                referrerPolicy="no-referrer"
              />

              {/* Next */}
              <button
                onClick={nextPhoto}
                className="absolute right-2 sm:-right-16 bg-white/15 text-white/95 hover:bg-white/25 p-3 rounded-full backdrop-blur-sm transition cursor-pointer"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </motion.div>

            {/* Caption bar */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="relative bg-black/60 px-6 py-3 border border-white/10 rounded-full z-10 max-w-md text-center mt-6 text-white text-xs font-semibold backdrop-blur-sm"
            >
              <span>{IMAGES[activePhotoIndex].title}</span>
              <span className="text-gray-400 font-light ml-2">
                ({activePhotoIndex + 1} / {IMAGES.length})
              </span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
