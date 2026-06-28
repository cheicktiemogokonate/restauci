// ============================================================================
// TYPES PARTAGÉS POUR LES COMPOSANTS DE LA PAGE PUBLIQUE
// ============================================================================

export interface Dish {
  id: string;
  name: string;
  description: string;
  price: number; // en FCFA entiers
  image: string;
  category: "plats" | "boissons" | "desserts";
  isPopular?: boolean;
}

export interface Review {
  id: string;
  author: string;
  rating: number; // 1-5
  date: string;
  text: string;
  avatarColor?: string;
}

export interface Reservation {
  name: string;
  email: string;
  phone: string;
  guests: number;
  date: string;
  time: string;
  specialRequests?: string;
}
