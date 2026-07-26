"use client";

import StaggeredMenu from "../landing/components/StaggeredMenu";

const navigationItems = [
  { label: "Accueil", ariaLabel: "Aller à l'accueil", link: "#accueil" },
  { label: "Informations", ariaLabel: "Voir les informations pratiques", link: "#infos" },
  { label: "Localisation", ariaLabel: "Voir la localisation du restaurant", link: "#contact" },
];

/** Le bouton de navigation animé fait partie de l'identité de la vitrine. */
export default function Navbar() {
  return (
    <StaggeredMenu
      position="right"
      items={navigationItems}
      socialItems={[]}
      displaySocials={false}
      displayItemNumbering={false}
      menuButtonColor="#ffffff"
      openMenuButtonColor="#111827"
      changeMenuColorOnOpen
      colors={["#16a34a", "#15803d", "#166534"]}
      accentColor="#16a34a"
      className="text-brand-dark mt-2 mr-2 font-sans"
    />
  );
}
