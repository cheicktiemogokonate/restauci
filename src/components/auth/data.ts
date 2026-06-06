import {
  Shield,
  Cloud,
  Headphones,
  RefreshCw,
} from "lucide-react";
import { FoodImage, LoginFeatureBadge } from "./types";

export const foodImages: FoodImage[] = [
  { url: "https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?auto=format&fit=crop&q=80&w=400", alt: "Burrata starter" },
  { url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=400", alt: "Gourmet Burger" },
  { url: "https://images.unsplash.com/photo-1546548970-71785318a17b?auto=format&fit=crop&q=80&w=400", alt: "Elegant Spaghetti Pasta" },
  { url: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=400", alt: "Stone oven Pizza" },
  { url: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&q=80&w=400", alt: "Lava Chocolate Fondant" },
  { url: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&q=80&w=400", alt: "Chef seasoning dinner" },
  { url: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=400", alt: "Raw vegetarian bowl" },
  { url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=400", alt: "Cozy bistro lounge" },
  { url: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&q=80&w=400", alt: "Fresh japanese Ramen" },
  { url: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=400", alt: "Ribeye Steak meal" },
  { url: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=400", alt: "Refreshing Mint Cocktail" },
  { url: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&q=80&w=400", alt: "Red berry Cheesecake biscuit" }
];

export const loginFeatureBadges: LoginFeatureBadge[] = [
  { icon: Shield, title: "Sécurisé et fiable", lines: ["Vos données sont", "100% protégées"] },
  { icon: Cloud, title: "Accessible partout", lines: ["Depuis tous vos", "appareils"] },
  { icon: Headphones, title: "Support réactif", lines: ["Notre équipe vous", "accompagne 7j/7"] },
  { icon: RefreshCw, title: "Mises à jour automatiques", lines: ["Toujours à jour,", "sans effort"] }
];
