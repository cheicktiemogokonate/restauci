// ============================================================================
// TYPES DE PRÉSENTATION POUR LA PAGE RESTAURANT PUBLIQUE
// ============================================================================

export interface Dish {
  id: string;
  name: string;
  description: string;
  price: number; // en FCFA entiers
  image: string | null;
  categoryId: string;
  categoryName: string;
  isPopular?: boolean;
}
