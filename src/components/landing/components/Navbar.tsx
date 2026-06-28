"use client";
import { ArrowRight, Utensils } from "lucide-react";
import { useEffect, useState } from "react";
import { navigationLinks } from "../data";
import StaggeredMenu from "./StaggeredMenu";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const menuItems = navigationLinks.map((link) => ({
    label: link.name,
    ariaLabel: `Aller à la section ${link.name}`,
    link: link.href,
  }));

  const socialItems = [
    { label: "Twitter", link: "https://twitter.com" },
    { label: "Facebook", link: "https://facebook.com" },
    { label: "Instagram", link: "https://instagram.com" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white/80 backdrop-blur-md border-b border-[#EAEAEA] py-3 shadow-xs"
          : "bg-transparent py-4"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-brand-green flex items-center justify-center shadow-md shadow-[#0f8a5f33] group-hover:scale-105 transition-transform duration-300">
              <Utensils className="h-5.5 w-5.5 text-white" />
            </div>
            <span className="font-display font-extrabold text-2xl tracking-tight text-brand-dark">
              Restau<span className="text-brand-green">CI</span>
            </span>
          </a>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            {navigationLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-brand-dark/75 hover:text-brand-green transition-colors duration-250 font-sans"
              >
                {link.name}
              </a>
            ))}
          </div>

          {/* Call to Actions & Mobile Staggered Menu */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-4">
              <a
                href="/login"
                className="text-sm font-semibold text-brand-dark hover:text-brand-green transition-colors duration-250 cursor-pointer"
              >
                Connexion
              </a>
              <a
                href="#cta"
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-brand-green hover:bg-[#0c734e] rounded-xl shadow-xs transition-all duration-200 hover:-translate-y-[1px] active:translate-y-0 cursor-pointer"
              >
                Essayer gratuitement
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </div>

            {/* Premium Staggered Menu */}
            <StaggeredMenu
              position="right"
              items={menuItems}
              socialItems={socialItems}
              displaySocials={true}
              displayItemNumbering={true}
              menuButtonColor="#111827"
              openMenuButtonColor="#111827"
              changeMenuColorOnOpen={true}
              colors={["#16a34a", "#15803d", "#166534"]}
              accentColor="#16a34a"
              className="md:hidden text-brand-dark font-sans"
            />
          </div>
        </div>
      </div>
    </nav>
  );
}
