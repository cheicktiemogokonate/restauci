"use client";

import { AppLogo } from "@/components/ui/app-logo";
import Link from "next/link";
import { FooterBackgroundGradient, TextHoverEffect } from "./hover-footer";

const footerLinks = [
  {
    title: "Toutci",
    links: [
      { label: "Découvrir les restaurants", href: "/client" },
      { label: "Devenir partenaire", href: "/register" },
      { label: "Connexion restaurateur", href: "/login" },
      { label: "Tarifs", href: "#pricing" },
    ],
  },
  {
    title: "Informations légales",
    links: [
      { label: "Conditions générales", href: "/conditions-generales" },
      { label: "Confidentialité", href: "/confidentialite" },
      { label: "Cookies", href: "/cookies" },
      { label: "Mentions légales", href: "/mentions-legales" },
    ],
  },
];

export default function HoverFooter() {
  return (
    <footer
      id="footer"
      className="relative m-4 h-fit overflow-hidden rounded-[2.5rem] border border-neutral-800 bg-[#0F0F11]/95 text-gray-300 shadow-2xl sm:m-8"
    >
      <div className="relative z-40 mx-auto max-w-7xl p-8 sm:p-14">
        <div className="grid grid-cols-1 gap-12 border-b border-neutral-800 pb-12 md:grid-cols-3">
          <div className="space-y-4">
            <AppLogo
              href="/"
              alt="Toutci"
              className="group"
              iconSizeClassName="w-16 sm:w-18"
              textSizeClassName="w-24 sm:w-28"
              textVisibilityClassName="block"
            />
            <p className="max-w-sm text-sm leading-relaxed text-gray-400">
              Une app pour découvrir les restaurants, commander et développer
              son établissement en Côte d&apos;Ivoire.
            </p>
          </div>

          {footerLinks.map((section) => (
            <nav key={section.title} aria-label={section.title}>
              <h2 className="mb-5 text-sm font-semibold text-white">
                {section.title}
              </h2>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-400 hover:text-[#22C55E]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <p className="py-7 text-center text-xs text-gray-500">
          © 2026 Toutci. Tous droits réservés.
        </p>
      </div>

      <div className="hidden h-88 -mt-52 -mb-36 w-full max-w-full select-none items-center justify-center overflow-hidden lg:flex sm:h-120">
        <TextHoverEffect
          text="Toutci"
          className="z-50 mx-auto block h-auto w-full max-w-5xl"
        />
      </div>
      <FooterBackgroundGradient />
    </footer>
  );
}
