import type { Metadata } from "next";
import { LenisProvider } from "@/components/providers/lenis-provider";
import { MotionFooter } from "@/components/landing/motion-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { PartnerHero } from "@/components/partner/partner-hero";
import { PartnerVerticals } from "@/components/partner/partner-verticals";
import { PartnerWorkflow } from "@/components/partner/partner-workflow";
import { PartnerPricing } from "@/components/partner/partner-pricing";
import { PartnerFaq } from "@/components/partner/partner-faq";
import { PartnerCta } from "@/components/partner/partner-cta";

export const metadata: Metadata = {
  title: "Toutci Partenaires — Développez votre Restaurant ou Résidence",
  description:
    "Rejoignez le réseau de partenaires Toutci. Digitalisez vos commandes de restaurant et réservations de résidences en Côte d’Ivoire avec des tarifs transparents et des paiements garantis.",
  openGraph: {
    title: "Toutci Partenaires — Espace Professionnel & Tarification",
    description:
      "Digitalisez vos commandes, livraisons et hébergements avec Toutci. 0 FCFA pour démarrer, commissions réduites et paiements sécurisés.",
    type: "website",
  },
};

export const dynamic = "force-dynamic";

export default function PartenairesPage() {
  return (
    <LenisProvider>
      <a className="skip-link" href="#main-partner-content">
        Aller au contenu principal
      </a>
      <SiteHeader />
      <main id="main-partner-content" className="partner-page-wrapper">
        <PartnerHero />
        <PartnerVerticals />
        <PartnerWorkflow />
        <PartnerPricing />
        <PartnerFaq />
        <PartnerCta />
      </main>
      <MotionFooter />
    </LenisProvider>
  );
}
