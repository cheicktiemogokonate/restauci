// Client component for interactive state (modals)
"use client";

import { Categorie, Plat, Restaurant } from "@/types";
import { useState } from "react";
import { CreneauHoraire } from "@/lib/db/types";
import AboutUs from "./about-us";
import Footer from "./footer";
import Hero from "./hero";
import MenuModal from "./menu-modal";
import Navbar from "./navbar";
import PracticalDetails from "./practical-details";
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
    categoryId: string;
    categoryName: string;
    isPopular?: boolean;
  }[];
  creneauxList: CreneauHoraire[];
}

export default function RestaurantPageClient({
  restaurant,
  dishes,
  creneauxList,
}: RestaurantPageClientProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleOpenMenu = () => setIsMenuOpen(true);
  const handleCloseMenu = () => setIsMenuOpen(false);

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#fafaf8] mt-0">
        <Hero
          onOpenMenu={handleOpenMenu}
          restaurant={restaurant}
        />

        <AboutUs restaurant={restaurant} />
        <PracticalDetails restaurant={restaurant} creneauxList={creneauxList} />

        <MenuModal
          isOpen={isMenuOpen}
          onClose={handleCloseMenu}
          dishes={dishes}
          restaurant={restaurant}
        />
      </main>

      <PanierFlottant />

      <Footer restaurant={restaurant} />
    </>
  );
}
