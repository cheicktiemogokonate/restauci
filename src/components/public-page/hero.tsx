"use client";
import { Restaurant } from "@/types";
import { Button } from "@/components/ui/button";
import { CheckCircle2, MapPin, Phone, Share2, Star } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useState } from "react";

interface HeroProps {
  onOpenMenu: () => void;
  restaurant: Restaurant;
}

export default function Hero({
  onOpenMenu,
  restaurant,
}: HeroProps) {
  const [copied, setCopied] = useState(false);
  const [phoneVisible, setPhoneVisible] = useState(false);
  const commandesOuvertes = restaurant.enLigne && restaurant.accepteCommandes;

  const handleShare = async () => {
    const url = window.location.href;
    const shareData = {
      title: restaurant.nom,
      text: `Découvrez ${restaurant.nom} sur Toutci !`,
      url,
    };

    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // user cancelled or error – fall through to clipboard
      }
    }

    // Fallback: copy to clipboard
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCall = () => {
    setPhoneVisible(true);
    setTimeout(() => setPhoneVisible(false), 5000);
  };

  return (
    <section
      id="accueil"
      className="relative -mt-10 min-h-[70vh] w-full overflow-hidden bg-gray-950 text-white"
    >
      {/* Background Image with elegant overlay */}
      <div className="min-h-screen w-full overflow-hidden bg-linear-to-t from-black via-black/50 to-black/20">
        <Image
          src={
            restaurant.banniereUrl
              ? restaurant.banniereUrl
              : "/assets/images/hero_bg_1781800187268.jpg"
          }
          alt={restaurant.nom}
          className="w-full h-screen object-cover opacity-85 scale-105 duration-1000 select-none animate-pulse-slow "
          referrerPolicy="no-referrer"
          width={1920}
          height={1080}
          priority
          loading="eager"
        />

        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/60 to-black/40 lg:from-black/60 lg:via-black/40 lg:to-black/20" />
      </div>

      <div className="absolute inset-x-0 top-1/2 mx-auto flex w-full max-w-7xl -translate-y-1/2 flex-col justify-end px-4 pb-12 sm:px-6 sm:pb-20 lg:px-8">
        {/* Hero Details Text Box */}
        <div className="max-w-2xl md:space-y-10 space-y-5 ">
          {/* Tagline Status */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 text-white p-3 mt-3 rounded-full text-xs font-semibold tracking-wider uppercase"
          >
            <span className="relative flex w-2 shrink-0 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-300"></span>
            </span>
            <span>
              {commandesOuvertes ? "Commandes ouvertes" : "Commandes suspendues"}
            </span>
          </motion.div>

          {/* Restaurant Title info */}
          <div className="space-y-4 ">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="font-serif text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight text-white flex items-center gap-3.5"
            >
              {restaurant.nom}
            </motion.h1>
          </div>

          {/* Sub Row details */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-wrap items-center gap-x-5 gap-y-2.5 text-xs sm:text-sm font-semibold text-gray-200"
          >
            <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-sm">
              <Star className="h-4 w-4 text-[#e2b34a] fill-[#e2b34a]" />
              <span className="text-white">
                {restaurant.noteMoyenne?.toFixed(1) || "N/A"}
              </span>
              <span className="text-gray-400 font-light">
                ({restaurant.nombreAvis} avis)
              </span>
            </span>
            <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-sm">
              <MapPin className="h-4 w-4 text-white" />
              <span>{restaurant.adresse}</span>
            </span>
          </motion.div>

          {/* Buttons Layout */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-wrap items-center gap-4 pt-4"
          >
            {/* View menu green button */}
            <Button
              onClick={onOpenMenu}
              size="lg"
              className="rounded-xl px-7 shadow-lg"
            >
              Voir le menu
            </Button>

            {/* Reserve table white/beige button */}
            {/* <button
              onClick={onOpenReserve}
              className="bg-amber-50/95 text-gray-950 px-7 py-3.5 rounded-full text-xs sm:text-sm font-bold shadow-lg hover:bg-white active:scale-[0.98] transition duration-200 cursor-pointer"
            >
              Réserver une table 
            </button> */}

            {/* Circular phone action button */}
            <div className="relative">
              <Button
                onClick={handleCall}
                variant="outline"
                size="icon-lg"
                className="rounded-xl border-gray-400/40 bg-black/35 text-white backdrop-blur-md hover:bg-black/60 hover:text-white"
                aria-label="Afficher le téléphone du restaurant"
              >
                <Phone className="h-4.5 w-4.5" />
              </Button>

              <AnimatePresence>
                {phoneVisible && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-14 left-0 w-56 p-3 bg-white border border-gray-100 rounded-xl shadow-xl text-gray-900 z-10 text-xs"
                  >
                    <p className="font-semibold text-gray-500 mb-1 uppercase tracking-wider text-[10px]">
                      Téléphone du restaurant :
                    </p>
                    <a
                      href={`tel:${restaurant.telephone}`}
                      className="font-bold text-sm text-[#0b663b] hover:underline block"
                    >
                      {restaurant.telephone}
                    </a>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Circular share action button */}
            <div className="relative">
              <Button
                onClick={handleShare}
                variant="outline"
                size="icon-lg"
                className="rounded-xl border-gray-400/40 bg-black/35 text-white backdrop-blur-md hover:bg-black/60 hover:text-white"
                aria-label="Partager ce restaurant"
              >
                <Share2 className="h-4.5 w-4.5" />
              </Button>

              <AnimatePresence>
                {copied && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-14 left-0 bg-gray-900 text-white rounded-lg px-3 py-1.5 text-xs flex items-center gap-1.5 shadow-lg whitespace-nowrap z-10"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Lien d&apos;accès copié !</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
