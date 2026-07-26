import { Mail, MapPin, Utensils } from "lucide-react";
import BackgroundDecoration from "./BackgroundDecoration";
import Link from "next/link";

export default function Footer() {
  const years = new Date().getFullYear();

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const columns = [
    {
      title: "Plateforme",
      links: [
        { name: "Fiche restaurant", href: "#features" },
        { name: "Commandes en ligne", href: "#features" },
        { name: "Suivi des ventes", href: "#features" },
        { name: "Réservations & salle", href: "#features" },
        { name: "Grille de Tarifs", href: "#pricing" },
      ],
    },
    {
      title: "Légal",
      links: [
        { name: "Mentions légales", href: "/mentions-legales" },
        { name: "Politique de confidentialité", href: "/confidentialite" },
        { name: "Conditions générales", href: "/conditions-generales" },
        { name: "Gestion des cookies", href: "/cookies" },
      ],
    },
  ];

  return (
    <footer className="bg-white border-t border-[#EAEAEA] pt-16 pb-8 font-sans relative overflow-hidden">
      {/* Background radial glows */}
      <div
        className="absolute bottom-[-100px] -right-25 w-125 h-125 pointer-events-none -z-10"
        style={{
          background:
            "radial-gradient(circle, rgba(34,197,94,0.06) 0%, transparent 70%)",
        }}
      />

      {/* Background SVG vector decorations in footer corners */}
      <BackgroundDecoration
        src="/backgrounds/tomato-outline.svg"
        className="absolute bottom-[-90px] left-[-80px] opacity-25"
        size={260}
      />
      <BackgroundDecoration
        src="/backgrounds/mushroom-outline.svg"
        className="absolute top-[-50px] right-[-80px] opacity-20"
        size={240}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Main Links Area */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-12 pb-12 border-b border-[#EAEAEA]">
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-6">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl bg-brand-green flex items-center justify-center">
                <Utensils className="h-5.5 w-5.5 text-white" />
              </div>
              <span className="font-display font-extrabold text-2xl tracking-tight text-brand-dark">
                Tout<span className="text-brand-green">ci</span>
              </span>
            </Link>

            <p className="text-xs text-brand-dark/65 leading-relaxed max-w-sm">
              Le marketplace qui connecte les restaurants et les clients de
              Bouaké. Soyez visibles, recevez vos commandes et développez
              votre activité localement.
            </p>

            {/* Address cards */}
            <div className="space-y-2 text-xs text-gray-500 font-medium">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-brand-green shrink-0" />
                <span>Bouaké, Côte d&apos;Ivoire</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-brand-green shrink-0" />
                <span>contact@toutci.com</span>
              </div>
            </div>
          </div>

          {/* Links Cols */}
          {columns.map((col, index) => (
            <div key={index} className="space-y-4">
              <h4 className="text-xs font-bold text-brand-dark uppercase tracking-wider">
                {col.title}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map((link, idx) => (
                  <li key={idx}>
                    <a
                      href={link.href}
                      className="text-xs text-brand-dark/65 hover:text-brand-green transition-colors flex items-center gap-0.5 group"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom copyright notice panel */}
        <div className="pt-0 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Trademark text */}
          <div className="text-xs text-brand-dark/50">
            &copy; {years} Toutci. Tous droits réservés.
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleScrollToTop}
              className="ms-2 text-[10px] font-bold text-brand-green bg-brand-green/8 hover:bg-brand-green hover:text-white py-1.5 px-3 rounded-lg border border-brand-green/10 cursor-pointer transition-all"
            >
              ▲ Haut de page
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
