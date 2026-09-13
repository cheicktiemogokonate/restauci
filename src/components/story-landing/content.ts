/**
 * Contenu éditorial de la landing narrative.
 *
 * Toutes les chaînes visibles par l'utilisateur vivent ici afin que le texte
 * et la marque se modifient en un seul endroit (le nom du produit n'est pas
 * définitif — voir spec §24 : ne jamais disperser brandName dans le code).
 */

export const brandName = "Toutci";

export const hero = {
  titleParts: [
    { text: "Découvrez.", tone: "neutral" as const },
    { text: "Commandez.", tone: "accent" as const },
    { text: "Réservez.", tone: "accent" as const },
  ],
  subtitle:
    "Une seule expérience pour trouver ce qu'il vous faut autour de vous.",
};

export const nav = {
  /** TODO: route réelle de l'espace établissement quand elle sera arrêtée. */
  proSpaceHref: "/connexion",
  proSpaceLabel: "Vous êtes un établissement ?",
};

export const safariMockup = {
  /** URL fictive affichée dans la barre d'adresse du mockup Safari. */
  url: `espace.${brandName.toLowerCase()}.ci`,
};

/**
 * Liens des stores : volontairement vides tant que les URLs réelles ne sont
 * pas publiées (les boutons restent en place, seule la valeur change — spec §23).
 */
export const storeLinks = {
  ios: {
    label: "Télécharger sur iOS",
    href: "", // TODO: URL App Store
  },
  android: {
    label: "Télécharger sur Android",
    href: "", // TODO: URL Play Store
  },
};

export const proCta = {
  title: "Vous êtes un établissement ?",
  linkLabel: "Découvrir l'espace établissement",
  href: "/connexion", // TODO: même destination que nav.proSpaceHref
};

export const footer = {
  links: [
    { label: "Application", href: "#application" },
    { label: "Établissements", href: "#etablissements" },
    { label: "Contact", href: "#contact" },
  ],
  legal: `© ${new Date().getFullYear()} ${brandName}. Tous droits réservés.`,
};
