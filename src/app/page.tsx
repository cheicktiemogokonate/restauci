import dynamic from "next/dynamic";
import ClickSpark from "@/components/landing/components/ClickSpark";
import Navbar from "@/components/landing/components/Navbar";
import type { Metadata } from "next";

export const revalidate = false; // Static page

const Hero = dynamic(() => import("@/components/landing/components/Hero"), { loading: () => <div /> });
const TrustedBy = dynamic(() => import("@/components/landing/components/TrustedBy"), { loading: () => <div /> });
const AboutPlatform = dynamic(() => import("@/components/landing/components/AboutPlatform"), { loading: () => <div /> });
const FeatureGrid = dynamic(() => import("@/components/landing/components/FeatureGrid"), { loading: () => <div /> });
const DashboardShowcase = dynamic(() => import("@/components/landing/components/DashboardShowcase"), { loading: () => <div /> });
const Benefits = dynamic(() => import("@/components/landing/components/Benefits"), { loading: () => <div /> });
const CTA = dynamic(() => import("@/components/landing/components/CTA"), { loading: () => <div /> });
const Testimonials = dynamic(() => import("@/components/landing/components/Testimonials"), { loading: () => <div /> });
const HoverFooter = dynamic(() => import("@/components/landing/ui/demo"), { loading: () => <div /> });


export const metadata: Metadata = {
  title: "RestauCI - Solution Complète de Gestion de Restaurant & POS",
  description: "Gérez votre restaurant en toute simplicité. Commandes, menus, stocks, réservations et analyses avancées dans une seule plateforme moderne.",
};

export default function Home() {
  return (
    <div className="relative min-h-screen font-sans selection:bg-brand-green selection:text-white">

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
    </div>
  );
}
