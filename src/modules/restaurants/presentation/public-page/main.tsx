// Client component for interactive state (modals)
"use client";

import type {
  PublicRestaurantDTO as Restaurant,
  RestaurantScheduleDTO,
} from "../../contracts";
import { useState } from "react";
import AboutUs from "./about-us";
import Footer from "./footer";
import Hero from "./hero";
import MenuModal from "@/components/client-app/menu-modal";
import Navbar from "./navbar";
import PracticalDetails from "./practical-details";
import { PanierFlottant } from "@/components/client-app/panier-flottant";

interface RestaurantPageClientProps {
  restaurant: Restaurant;
  dishes: {
    id: string;
    name: string;
    description: string;
    price: number;
    image: string | null;
    categoryId: string;
    categoryName: string;
    isPopular?: boolean;
  }[];
  creneauxList: RestaurantScheduleDTO[];
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
