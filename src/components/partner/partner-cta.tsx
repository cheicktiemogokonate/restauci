"use client";

import { CTASection } from "@/components/ui/cta-with-glow";

export function PartnerCta() {
  return (
    <section className="bg-transparent border-t border-[#dfe8e2]">
      <CTASection
        title="Prêt à booster vos ventes et vos réservations ?"
        subtitle="Rejoignez les meilleurs restaurants et résidences de Côte d’Ivoire. Créez votre compte gratuitement et découvrez l’écosystème Toutci."
        action={{
          text: "Rejoindre le réseau",
          href: "#tarifs",
          variant: "glow",
        }}
      // secondaryAction={{
      //   text: "Connexion Espace Pro",
      //   href: "/login",
      // }}
      // footerText={
      //   <div className="pt-4 max-w-lg mx-auto">
      //     <p className="text-xs text-[#5e6e64]">
      //       Vous préférez qu’un conseiller vous accompagne ou vienne vous rencontrer ?
      //     </p>
      //     <Link
      //       href="https://wa.me/22507000000?text=Bonjour%20Toutci%2C%20je%20souhaite%20des%20informations%20sur%20le%20partenariat"
      //       target="_blank"
      //       rel="noopener noreferrer"
      //       className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-[#087a50] hover:underline"
      //     >
      //       Discuter directement sur WhatsApp (+225 07 00 00 00)
      //       <ArrowRight className="size-3" />
      //     </Link>
      //   </div>
      // }
      />
    </section>
  );
}
