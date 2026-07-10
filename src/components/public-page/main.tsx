// Client component for interactive state (modals)
"use client";

import { Categorie, Plat, Restaurant } from "@/types";
import { useState } from "react";
import { Reservation } from "../types";
import { CreneauHoraire } from "@/lib/db/types";
import AboutUs from "./about-us";
import Footer from "./footer";
import GallerySection from "./gallery-section";
import Hero from "./hero";
import MenuModal from "./menu-modal";
import Navbar from "./navbar";
import PracticalDetails from "./practical-details";
import ReserveModal from "./reserve-modal";
import ReviewsSection from "./reviews-section";
import { PanierFlottant } from "../client-app/panier-flottant";

interface RestaurantPageClientProps {
  restaurant: Restaurant;
  categoriesWithPlats: (Categorie & { plats: Plat[] })[];
  dishes: {
    id: string;
    name: string;
    description: string;
    price: number;
    image: string;
    category: "plats" | "boissons" | "desserts";
    isPopular?: boolean;
  }[];
  creneauxList: CreneauHoraire[];
}

export default function RestaurantPageClient({
  restaurant,
  categoriesWithPlats,
  dishes,
  creneauxList,
}: RestaurantPageClientProps) {
  // State for modal controls (these need to be client-side)
  const [isReserveOpen, setIsReserveOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('accueil');

  const handleOpenReserve = () => setIsReserveOpen(true);
  const handleCloseReserve = () => setIsReserveOpen(false);

  const handleOpenMenu = () => setIsMenuOpen(true);
  const handleCloseMenu = () => setIsMenuOpen(false);

  const handleReserveSuccess = (info: Reservation) => {
    console.log("Réservation enregistrée :", info);
    // In a real app, you would save this to the database
  };

  return (
    <>
      <Navbar
        onOpenReserve={handleOpenReserve}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <main className="min-h-screen bg-[#fafaf8] mt-0">
        <Hero
          onOpenMenu={handleOpenMenu}
          onOpenReserve={handleOpenReserve}
          restaurant={restaurant}
        />

        {/* Floating Practical Info */}
        {/* <PracticalInfo restaurant={restaurant} /> */}

        {/* À propos de nous */}
        <AboutUs restaurant={restaurant} />

        {/* Informations pratiques details cards */}
        <PracticalDetails onOpenReserve={handleOpenReserve} restaurant={restaurant} creneauxList={creneauxList} />

        {/* Gallery & Popular menu dishes */}
        <GallerySection onOpenMenu={handleOpenMenu} dishes={dishes} />

        {/* Customer reviews and dynamic submission panel */}
        <ReviewsSection restaurant={restaurant} />

        {/* Menu Modal */}
        <MenuModal
          isOpen={isMenuOpen}
          onClose={handleCloseMenu}
          dishes={dishes}
          restaurant={restaurant}
        />

        {/* Reserve Modal */}
        <ReserveModal
          isOpen={isReserveOpen}
          onClose={handleCloseReserve}
          onReserveSuccess={handleReserveSuccess}
          restaurant={restaurant}
        />
      </main>

      <PanierFlottant />

      {/* Footer layout containing Interactive Local map & details */}
      <Footer restaurant={restaurant} />
    </>
  );
}
