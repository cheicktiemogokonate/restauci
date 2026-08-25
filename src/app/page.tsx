export const dynamic = "force-dynamic";
export const revalidate = 0;

import Navbar from "@/components/landing/components/Navbar";
import Pricing from "@/components/landing/components/Pricing";
import type { Metadata } from "next";
import nextDynamic from "next/dynamic";
import { getPublishedSubscriptionCatalogue } from "@/modules/subscriptions/server";

const Hero = nextDynamic(() => import("@/components/landing/components/Hero"), {
  loading: () => <div />,
});
const AboutPlatform = nextDynamic(
  () => import("@/components/landing/components/AboutPlatform"),
  { loading: () => <div /> },
);
const HoverFooter = nextDynamic(() => import("@/components/landing/ui/demo"), {
  loading: () => <div />,
});

export const metadata: Metadata = {
  title: "Toutci — une app pour tout",
  description:
    "Découvrez des restaurants et des résidences vérifiées en Côte d’Ivoire avec Toutci.",
};

export default async function Home() {
  const catalogue = await getPublishedSubscriptionCatalogue();
  return (
    <div className="relative min-h-screen font-sans selection:bg-brand-green selection:text-white">
      {/* 1. Header Navigation */}
      <Navbar />

      {/* 2. Hero Interactive Block */}
      <Hero />

      {/* Fonctionnement de la plateforme */}
      <AboutPlatform />

      {/* Offres restaurateurs */}
      <Pricing plans={catalogue.plans.filter((plan) => plan.actif)} />

      {/* Pied de page */}
      <HoverFooter />
    </div>
  );
}
