import AboutPlatform from "@/components/landing/components/AboutPlatform";
import Benefits from "@/components/landing/components/Benefits";
import ClickSpark from "@/components/landing/components/ClickSpark";
import DashboardShowcase from "@/components/landing/components/DashboardShowcase";
import FeatureGrid from "@/components/landing/components/FeatureGrid";
import Hero from "@/components/landing/components/Hero";
import Navbar from "@/components/landing/components/Navbar";
import Testimonials from "@/components/landing/components/Testimonials";
import TrustedBy from "@/components/landing/components/TrustedBy";
import CTA from "@/components/landing/components/CTA";
import HoverFooter from "@/components/landing/ui/demo";
import type { Metadata } from "next";


export const metadata: Metadata = {
  title: "RestauCI - Solution Complète de Gestion de Restaurant & POS",
  description: "Gérez votre restaurant en toute simplicité. Commandes, menus, stocks, réservations et analyses avancées dans une seule plateforme moderne.",
};

export default function Home() {
  return (
    <div className="relative min-h-screen font-sans selection:bg-brand-green selection:text-white">
      <ClickSpark
        sparkColor="#16a34a"
        sparkSize={12}
        sparkRadius={20}
        sparkCount={10}
        duration={500}
        easing="ease-out"
      >
        {/* 1. Header Navigation */}
        <Navbar />

        {/* 2. Hero Interactive Block */}
        <Hero />

        {/* 3. Social Clients Logos Banner */}
        <TrustedBy />

        {/* 4. Under-device ecosystem details */}
        <AboutPlatform />

        {/* 5. 4 Premium Feature Grid Cards */}
        <FeatureGrid />

        {/* 6. Showcase Dashboard Toggles (Menu/Analytics/Staff) */}
        <DashboardShowcase />

        {/* 7. Key metrics efficiency benefits */}
        <Benefits />

        {/* 8. Pricing CTA section */}
        <CTA />

        {/* 9. Masonry comments list */}
        <Testimonials />

        {/* 10. Multi-column sitemap Footer with brand hover text effect */}
        <HoverFooter />
      </ClickSpark>
    </div>
  );
}
