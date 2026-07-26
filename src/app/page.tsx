import Navbar from "@/components/landing/components/Navbar";
import Pricing from "@/components/landing/components/Pricing";
import type { Metadata } from "next";
import dynamic from "next/dynamic";

export const revalidate = false; // Static page

const Hero = dynamic(() => import("@/components/landing/components/Hero"), {
  loading: () => <div />,
});
const AboutPlatform = dynamic(
  () => import("@/components/landing/components/AboutPlatform"),
  { loading: () => <div /> },
);
const HoverFooter = dynamic(() => import("@/components/landing/ui/demo"), {
  loading: () => <div />,
});

export const metadata: Metadata = {
  title: "Toutci — une app pour tout",
  description:
    "Toutci connecte les clients aux restaurants de Côte d’Ivoire. Découvrez les menus, commandez et suivez votre commande.",
};

export default function Home() {
  return (
    <div className="relative min-h-screen font-sans selection:bg-brand-green selection:text-white">
      {/* 1. Header Navigation */}
      <Navbar />

      {/* 2. Hero Interactive Block */}
      <Hero />

      {/* Fonctionnement de la plateforme */}
      <AboutPlatform />

      {/* Offres restaurateurs */}
      <Pricing />

      {/* Pied de page */}
      <HoverFooter />
    </div>
  );
}
