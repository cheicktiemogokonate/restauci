export interface NavigationLink {
  name: string;
  href: string;
}

export interface Benefit {
  id: string;
  iconName: "Zap" | "Trash2" | "Heart" | "TrendingUp";
  title: string;
  description: string;
}

export interface FeatureGridItem {
  id: string;
  iconName: "ShoppingBag" | "Layers" | "Calendar" | "BarChart3";
  title: string;
  description: string;
}

export interface Testimonial {
  id: string;
  title: string;
  text: string;
  avatar: string;
  name: string;
  role: string;
  restaurant: string;
}

export interface Dish {
  id: string;
  name: string;
  image: string;
  price: number;
  rating: number;
  category: string;
  salesCount: number;
}

export interface TrustedLogo {
  name: string;
  logo: string;
}

export const navigationLinks: NavigationLink[] = [
  { name: "Accueil", href: "#hero" },
  { name: "Fonctionnement", href: "#about" },
  { name: "Tarifs", href: "#pricing" },
  { name: "Contact", href: "#footer" },
];

export const benefitsData: Benefit[] = [
  {
    id: "b1",
    iconName: "Zap",
    title: "Installation instantanée",
    description:
      "Déployez votre caisse et votre gestion de cuisine en moins de 15 minutes, sans complexité technique.",
  },
  {
    id: "b2",
    iconName: "Heart",
    title: "Suivi de la satisfaction",
    description:
      "Améliorez l'expérience client grâce à des rapports clairs et un suivi en temps réel.",
  },
  {
    id: "b3",
    iconName: "Trash2",
    title: "Zéro gaspillage",
    description:
      "Réduisez le gaspillage alimentaire avec des alertes de stock et des prévisions de consommation.",
  },
  {
    id: "b4",
    iconName: "TrendingUp",
    title: "Croissance mesurable",
    description:
      "Augmentez votre chiffre d'affaires grâce à une gestion optimisée des commandes et des promotions.",
  },
];

export const featureGridData: FeatureGridItem[] = [
  {
    id: "f2",
    iconName: "Layers",
    title: "Une fiche qui vous rend visible",
    description:
      "Votre menu, vos photos et vos horaires sont visibles par les clients Toutci.",
  },
  {
    id: "f1",
    iconName: "ShoppingBag",
    title: "Commandes centralisées",
    description:
      "Recevez vos commandes en temps réel, sans les manquer ni les mélanger.",
  },
  {
    id: "f4",
    iconName: "BarChart3",
    title: "Suivi de vos ventes",
    description:
      "Visualisez ce qui se vend, quand, et combien vous encaissez.",
  },
  {
    id: "f3",
    iconName: "Calendar",
    title: "Horaires et services",
    description:
      "Gérez vos horaires et les modes sur place, à emporter ou en livraison.",
  },
];

export const testimonialData: Testimonial[] = [
  {
    id: "t1",
    title: "Des clients qu'on n'aurait jamais eus autrement.",
    text: "Toutci nous a permis d'être visibles sans rien changer à notre façon de travailler en cuisine.",
    avatar: "",
    name: "",
    role: "Restaurateur partenaire",
    restaurant: "Bouaké",
  },
  {
    id: "t2",
    title: "Nos commandes arrivent directement, sans les appels.",
    text: "Toutci centralise tout, ça libère du temps en cuisine et évite les erreurs de commande.",
    avatar: "",
    name: "",
    role: "Restaurateur partenaire",
    restaurant: "Bouaké",
  },
  {
    id: "t3",
    title: "On est passé de zéro présence en ligne à plusieurs commandes par jour.",
    text: "Avant Toutci, personne ne savait qu'on existait en dehors du quartier. Aujourd'hui les clients nous trouvent facilement et commandent directement.",
    avatar: "",
    name: "",
    role: "Restaurateur partenaire",
    restaurant: "Bouaké",
  },
];

export const trustedLogos: TrustedLogo[] = [
  { name: "Bistro Plaisir", logo: "🍽️" },
  { name: "Maison du Chef", logo: "🥖" },
  { name: "Café Lumière", logo: "☕" },
  { name: "Brasserie Verte", logo: "🌿" },
  { name: "Pâtisserie d’Or", logo: "🍰" },
];

export const dishesData: Dish[] = [
  {
    id: "dish1",
    name: "Burger Signature",
    image:
      "https://images.unsplash.com/photo-1550547660-d9450f859349?w=400&h=400&fit=crop&q=80",
    price: 14.9,
    rating: 4.8,
    category: "Plats chauds",
    salesCount: 125,
  },
  {
    id: "dish2",
    name: "Salade César Premium",
    image:
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=400&fit=crop&q=80",
    price: 12.5,
    rating: 4.7,
    category: "Salades",
    salesCount: 98,
  },
  {
    id: "dish3",
    name: "Pizza Pepperoni",
    image:
      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=400&fit=crop&q=80",
    price: 16.2,
    rating: 4.9,
    category: "Pizzas",
    salesCount: 145,
  },
  {
    id: "dish4",
    name: "Tartelette du Chef",
    image:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=400&fit=crop&q=80",
    price: 9.8,
    rating: 4.6,
    category: "Desserts",
    salesCount: 76,
  },
  {
    id: "dish5",
    name: "Filet de Saumon",
    image:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=400&fit=crop&q=80",
    price: 21.5,
    rating: 4.8,
    category: "Plats de poisson",
    salesCount: 89,
  },
];

export const pricingPlans = [
  {
    planKey: "decouverte",
    name: "Découverte",
    priceMonthly: null, // pas de cycle mensuel — plan gratuit à vie
    priceYearly: 0,
    commissionPercent: 15,
    description:
      "Pour tester Toutci sans risque et démarrer votre présence en ligne.",
    features: [
      "Fiche restaurant publiée après validation",
      "Gestion des commandes en temps réel",
      "Paiement de vos gains au cycle standard",
      "Jusqu'à 20 plats, 5 catégories",
    ],
    popular: false,
    ctaText: "Commencer gratuitement",
  },
  {
    planKey: "partenaire_fier",
    name: "Partenaire Fier",
    priceMonthly: null, // pas de cycle mensuel — annuel uniquement
    priceYearly: 50000,
    commissionPercent: 10,
    description:
      "Pour être vu en premier et bénéficier du meilleur taux de commission.",
    features: [
      "Tout ce qu'offre Croissance",
      'Badge "Partenaire" sur votre fiche',
      "Placement prioritaire dans les résultats de recherche",
      "Paiement de vos gains accéléré",
      "Support client prioritaire",
    ],
    popular: true,
    ctaText: "Devenir Partenaire Fier",
  },
  {
    planKey: "croissance",
    name: "Croissance",
    priceMonthly: null, // pas de cycle mensuel — annuel uniquement
    priceYearly: 25000,
    commissionPercent: 12,
    description:
      "Pour les restaurants prêts à lever leurs limites et réduire leur commission.",
    features: [
      "Tout ce qu'offre Découverte",
      "Menu et catégories illimités",
      "Commission réduite dès le paiement",
      "Activation après validation de l’offre",
    ],
    popular: false,
    ctaText: "Passer à Croissance",
  },
];
