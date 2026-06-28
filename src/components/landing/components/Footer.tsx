import {
  ArrowUpRight,
  Mail,
  MapPin,
  Phone,
  Share2,
  Utensils,
} from "lucide-react";
import BackgroundDecoration from "./BackgroundDecoration";

export default function Footer() {
  const years = new Date().getFullYear();

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const columns = [
    {
      title: "Produit",
      links: [
        { name: "Caisse Enregistreuse POS", href: "#features" },
        { name: "Gestion des Stocks", href: "#features" },
        { name: "Moniteur Cuisine", href: "#about" },
        { name: "Plan de Salle interactif", href: "#about" },
        { name: "Grille de Tarifs", href: "#pricing" },
      ],
    },
    {
      title: "Ressources",
      links: [
        { name: "Documentation Technique", href: "#" },
        { name: "Guides de Restauration", href: "#" },
        { name: "Blog RestauCI", href: "#" },
        { name: "Support Clientèle", href: "# pricing" },
        { name: "Status des API", href: "#" },
      ],
    },
    {
      title: "Entreprise",
      links: [
        { name: "À Propos de Nous", href: "#" },
        { name: "Carrières & Recrutement", href: "#" },
        { name: "Presse / Médias", href: "#" },
        { name: "Partenaires Metro / Food", href: "#" },
        { name: "Contact Commercial", href: "#" },
      ],
    },
    {
      title: "Légal",
      links: [
        { name: "Mentions Légales", href: "#" },
        { name: "Politique de Confidentialité", href: "#" },
        { name: "CGU & CGV", href: "#" },
        { name: "Conformité NF525 (Caisse)", href: "#" },
        { name: "Gestion des Cookies", href: "#" },
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
            <a href="#" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl bg-brand-green flex items-center justify-center">
                <Utensils className="h-5.5 w-5.5 text-white" />
              </div>
              <span className="font-display font-extrabold text-2xl tracking-tight text-brand-dark">
                Restau<span className="text-brand-green">CI</span>
              </span>
            </a>

            <p className="text-xs text-brand-dark/65 leading-relaxed max-w-sm">
              La plateforme logicielle d&apos;administration de restaurant
              certifiée NF525. Unifiez la salle, l&apos;inventaire et la cuisine
              sous une seule interface intelligente.
            </p>

            {/* Address cards */}
            <div className="space-y-2 text-xs text-gray-500 font-medium">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-brand-green shrink-0" />
                <span>250 Boulevard Saint-Germain, 75007 Paris</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-brand-green shrink-0" />
                <span>contact@restauci.com</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-brand-green shrink-0" />
                <span>+33 1 84 60 20 10 (Gratuit)</span>
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
                      {link.href === "#" && (
                        <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
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
          <div className="text-xs text-red-400">
            &copy; {years} RestauCI Tous droits réservés.
          </div>

          {/* Social Icons links */}
          <div className="flex items-center gap-4">
            <a
              href="#"
              className="p-2 rounded-lg bg-gray-50 hover:bg-brand-green/10 text-gray-400 hover:text-brand-green transition-all"
              aria-label="Twitter"
            >
              <Share2 className="h-4 w-4" />
            </a>
            <a
              href="#"
              className="p-2 rounded-lg bg-gray-50 hover:bg-brand-green/10 text-gray-400 hover:text-brand-green transition-all"
              aria-label="Facebook"
            >
              <Share2 className="h-4 w-4" />
            </a>
            <a
              href="#"
              className="p-2 rounded-lg bg-gray-50 hover:bg-brand-green/10 text-gray-400 hover:text-brand-green transition-all"
              aria-label="Instagram"
            >
              <Share2 className="h-4 w-4" />
            </a>
            <a
              href="#"
              className="p-2 rounded-lg bg-gray-50 hover:bg-brand-green/10 text-gray-400 hover:text-brand-green transition-all"
              aria-label="GitHub"
            >
              <Share2 className="h-4 w-4" />
            </a>

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
