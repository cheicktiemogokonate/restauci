"use client";
import { Heart, Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import StaggeredMenu from "../landing/components/StaggeredMenu";

interface NavbarProps {
  onOpenReserve: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const menuItems = [
  { id: "accueil", label: "Accueil" },
  // { id: "apropos", label: "À propos" },
  { id: "restaurants", label: "Restaurants" },
  { id: "menus", label: "Menus" },
  { id: "contact", label: "Contact" },
];

const navLinks = [
  { href: "#accueil", name: "Accueil" },
  // { id: "apropos", label: "À propos" },
  { href: "#restaurants", name: "Restaurants" },
  { href: "#menus", name: "Menus" },
  { href: "#contact", name: "Contact" },
];

const navLinks2 = navLinks.map((link) => ({
  label: link.name,
  ariaLabel: `Aller à la section ${link.name}`,
  link: link.href,
}));

export default function Navbar({
  onOpenReserve,
  activeTab,
  setActiveTab,
}: NavbarProps) {
  useEffect(() => {
    const observerCallback: IntersectionObserverCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveTab(entry.target.id);
        }
      });
    };

    const observerOptions = {
      root: null,
      // Se déclenche quand la section traverse le milieu de l'écran
      rootMargin: "-40% 0px -60% 0px",
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    menuItems.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [setActiveTab]);

  return (
    <>
      <nav className="hidden md:block sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-20">
            {/* Logo Brand */}
            {/* Desktop Nav Links */}
            <div className="flex items-center gap-8 font-semibold text-sm text-gray-600">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    // Dynamic scroll helper to target landing sections
                    const element = document.getElementById(item.id);
                    if (element) {
                      element.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      });
                    }
                  }}
                  className={`relative py-2 transition duration-200 cursor-pointer ${activeTab === item.id
                    ? "text-[#0b663b] font-bold"
                    : "hover:text-gray-900 hover:scale-[1.02]"
                    }`}
                >
                  {item.label}
                  {activeTab === item.id && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0b663b] rounded-full"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

      </nav>
      <StaggeredMenu
        position="right"
        items={navLinks2}
        socialItems={[]}
        displaySocials={false}
        displayItemNumbering={false}
        menuButtonColor="#ffffff"
        openMenuButtonColor="#111827"
        changeMenuColorOnOpen={true}
        colors={["#16a34a", "#15803d", "#166534"]}
        accentColor="#16a34a"
        className="md:hidden text-brand-dark font-sans mt-2 mr-2"
      />

    </>
  );
}
