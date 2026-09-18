"use client";

import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PARTNER_FAQS } from "@/lib/landing/partner-data";

export function PartnerFaq() {
  return (
    <section id="faq" className="py-16 md:py-24 bg-transparent border-t border-[#dfe8e2]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-5 md:gap-12 items-start">
          {/* Left info column */}
          <div className="md:col-span-2">
            <h2 className="font-heading font-black text-3xl sm:text-4xl text-[#102d1f] tracking-tight">
              Questions Fréquentes
            </h2>
            <p className="text-sm sm:text-base text-[#102d1f]/70 mt-3 leading-relaxed text-balance">
              Tout ce que vous devez savoir avant de débuter votre partenariat avec Toutci.
            </p>
            <div className="mt-8 p-5 rounded-2xl bg-white border border-[#dfe8e2] shadow-xs hidden md:block">
              <p className="text-xs font-semibold text-[#102d1f] mb-1">
                Une question spécifique ?
              </p>
              <p className="text-xs text-[#5e6e64] leading-relaxed mb-3">
                Notre équipe d&apos;accompagnement partenaire est à votre écoute.
              </p>
              <Link
                href="https://wa.me/22507000000?text=Bonjour%20Toutci%2C%20j%27ai%20une%20question%20sur%20le%20partenariat"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-[#087a50] hover:underline inline-flex items-center gap-1"
              >
                Contacter le support partenaire →
              </Link>
            </div>
          </div>

          {/* Right accordion column */}
          <div className="md:col-span-3">
            <Accordion type="single" collapsible defaultValue="faq-0" className="w-full space-y-3">
              {PARTNER_FAQS.map((faq, idx) => (
                <AccordionItem
                  key={`faq-${idx}`}
                  value={`faq-${idx}`}
                  className="rounded-2xl border border-[#dfe8e2] bg-white px-5 sm:px-6 transition-colors shadow-xs data-[state=open]:border-[#087a50]/40"
                >
                  <AccordionTrigger className="cursor-pointer text-sm sm:text-base font-bold text-left text-[#102d1f] hover:no-underline py-4">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-xs sm:text-sm text-[#5e6e64] leading-relaxed pb-4">
                      {faq.answer}
                    </p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            <div className="mt-6 p-4 rounded-2xl bg-white border border-[#dfe8e2] shadow-xs md:hidden">
              <p className="text-xs text-[#5e6e64]">
                Une question spécifique ?{" "}
                <Link
                  href="https://wa.me/22507000000?text=Bonjour%20Toutci%2C%20j%27ai%20une%20question%20sur%20le%20partenariat"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#087a50] font-bold hover:underline"
                >
                  Contacter le support partenaire
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
