export interface NavigationLink {
  name: string;
  href: string;
}

export const navigationLinks: NavigationLink[] = [
  { name: "Accueil", href: "#hero" },
  { name: "Résidences", href: "/residences" },
  { name: "Fonctionnement", href: "#about" },
  { name: "Tarifs", href: "#pricing" },
  { name: "Contact", href: "#footer" },
];
