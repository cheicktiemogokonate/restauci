"use client";
import { Globe, Mail, MapPin, Phone, Share2, Utensils } from "lucide-react";
import { FooterBackgroundGradient, TextHoverEffect } from "./hover-footer";
// import { FooterBackgroundGradient } from "@/components/ui/hover-footer";
// import { TextHoverEffect } from "@/components/ui/hover-footer";

function HoverFooter() {
  const years = new Date().getFullYear();

  // Footer link data adapted for RestauCI
  const footerLinks = [
    {
      title: "Solutions",
      links: [
        { label: "Caisse POS", href: "#features" },
        { label: "Gestion des Stocks", href: "#features" },
        { label: "Moniteur Cuisine", href: "#about" },
        { label: "Plan Interactif", href: "#about" },
      ],
    },
    {
      title: "Ressources",
      links: [
        { label: "Documentation", href: "#" },
        { label: "Guides Resto", href: "#" },
        {
          label: "Support Live",
          href: "#",
          pulse: true,
        },
        { label: "Politique de Prix", href: "#pricing" },
      ],
    },
  ];

  // Contact info data (Bouake, Côte d'Ivoire)
  const contactInfo = [
    {
      icon: <Mail size={18} className="text-[#22C55E]" />,
      text: "contact@restauci.com",
      href: "mailto:contact@restauci.com",
    },
    {
      icon: <Phone size={18} className="text-[#22C55E]" />,
      text: "+225 07 77 94 57 14",
      href: "tel:+2250777945714",
    },
    {
      icon: <MapPin size={18} className="text-[#22C55E]" />,
      text: "Bouake, Commerce, Côte d'Ivoire",
    },
  ];

  // Social media icons
  const socialLinks = [
    { icon: <Share2 size={20} />, label: "Facebook", href: "#" },
    { icon: <Share2 size={20} />, label: "Instagram", href: "#" },
    { icon: <Share2 size={20} />, label: "Twitter", href: "#" },
    { icon: <Share2 size={20} />, label: "Linkedin", href: "#" },
    { icon: <Globe size={20} />, label: "Tiktok", href: "#" },
  ];

  return (
    <footer
      id="footer"
      className="bg-[#0F0F11]/95 text-gray-300 relative h-fit rounded-[2.5rem] overflow-hidden m-4 sm:m-8 border border-neutral-800 shadow-2xl"
    >
      <div className="max-w-7xl mx-auto p-8 sm:p-14 z-40 relative">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 md:gap-8 lg:gap-16 pb-12">
          {/* Brand section */}
          <div className="flex flex-col space-y-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#0F8A5F] flex items-center justify-center">
                <Utensils className="h-5 w-5 text-white" />
              </div>
              <span className="text-white text-3xl font-extrabold tracking-tight">
                Restau<span className="text-[#22C55E]">CI</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed text-gray-400">
              La solution complète et certifiée de gestion de restaurant
              intelligente en Côte d&apos;Ivoire. Unifiez la salle, les stocks et la
              cuisine.
            </p>
          </div>

          {/* Footer link sections */}
          {footerLinks.map((section) => (
            <div key={section.title}>
              <h4 className="text-white text-lg font-semibold mb-6">
                {section.title}
              </h4>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.label} className="relative">
                    <a
                      href={link.href}
                      className="hover:text-[#22C55E] text-gray-400 hover:text-white transition-colors"
                    >
                      {link.label}
                    </a>
                    {/* {link.pulse && (
                      <span className="absolute top-2 right-[-14px] w-2 h-2 rounded-full bg-[#22C55E] animate-pulse"></span>
                    )} */}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Contact section */}
          <div>
            <h4 className="text-white text-lg font-semibold mb-6">
              Contactez-nous
            </h4>
            <ul className="space-y-4">
              {contactInfo.map((item, i) => (
                <li key={i} className="flex items-center space-x-3">
                  {item.icon}
                  {item.href ? (
                    <a
                      href={item.href}
                      className="hover:text-[#22C55E] text-gray-400 hover:text-white transition-colors"
                    >
                      {item.text}
                    </a>
                  ) : (
                    <span className="text-gray-400 hover:text-[#22C55E] transition-colors">
                      {item.text}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <hr className="border-t border-neutral-800 my-8 " />

        {/* Footer bottom */}
        <div className="flex flex-col md:flex-row justify-between items-center text-sm space-y-4 md:space-y-0 text-gray-400 mb-6">
          {/* Social icons */}
          <div className="flex space-x-6">
            {socialLinks.map(({ icon, label, href }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                className="hover:text-[#22C55E] text-gray-500 hover:text-white transition-colors"
              >
                {icon}
              </a>
            ))}
          </div>

          {/* Copyright */}
          <p className="text-center md:text-left text-xs text-gray-500">
            &copy; {years} RestauCI Tous droits réservés.
          </p>
        </div>
      </div>

      {/* Text hover effect */}
      <div className="lg:flex hidden h-[22rem] sm:h-[30rem] -mt-52 -mb-36 relative select-none pointer-events-auto w-full max-w-full overflow-hidden justify-center items-center">
        <TextHoverEffect
          text="RestauCI"
          className="z-50 w-full max-w-5xl h-auto block mx-auto"
        />
      </div>

      <FooterBackgroundGradient />
    </footer>
  );
}

export default HoverFooter;
