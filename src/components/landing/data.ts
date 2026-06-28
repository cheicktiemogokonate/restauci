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
  { name: "Fonctionnalités", href: "#features" },
  { name: "Avantages", href: "#benefits" },
  { name: "Témoignages", href: "#testimonials" },
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
    id: "f1",
    iconName: "ShoppingBag",
    title: "Commandes et menu unifiés",
    description:
      "Gérez votre carte, vos plats et vos offres spéciales depuis un seul tableau de bord intuitif.",
  },
  {
    id: "f2",
    iconName: "Layers",
    title: "Gestion intelligente des stocks",
    description:
      "Anticipez les ruptures et gérez vos approvisionnements avant que les ingrédients ne manquent.",
  },
  {
    id: "f3",
    iconName: "Calendar",
    title: "Réservations et salle",
    description:
      "Pilotez vos réservations, votre plan de salle et votre service depuis une interface claire.",
  },
  {
    id: "f4",
    iconName: "BarChart3",
    title: "Tableaux de bord opérationnels",
    description:
      "Visualisez vos performances, vos marges et vos ventes en temps réel pour prendre des décisions rapides.",
  },
];

export const testimonialData: Testimonial[] = [
  {
    id: "t1",
    title: "RestauCI nous a apporté une clarté immédiate.",
    text: "La gestion des stocks et la synchronisation entre la salle et la cuisine sont devenues fluides en quelques jours.",
    avatar:
      "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=100&h=100&fit=crop&q=80",
    name: "Céline R.",
    role: "Gérante",
    restaurant: "Bistro du Quai",
  },
  {
    id: "t2",
    title: "Notre équipe est plus rapide et mieux organisée.",
    text: "Les alertes de stock et la file de cuisine nous ont permis d’éviter des erreurs coûteuses.",
    avatar:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&q=80",
    name: "Jules M.",
    role: "Chef",
    restaurant: "Brasserie Gaston",
  },
  {
    id: "t3",
    title: "Un outil facile à prendre en main pour nos serveurs.",
    text: "Tout est centralisé, et les rapports journaliers sont clairs et utiles pour piloter le service.",
    avatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&q=80",
    name: "Amélie S.",
    role: "Responsable salle",
    restaurant: "Café L’Étoile",
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
