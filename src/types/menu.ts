import type { Plat } from "@/lib/db/types";

export interface MenuCardBadge {
  label: string;
  color: "green" | "red" | "orange" | "blue" | "yellow";
}

export interface MenuCardItem extends Plat {
  badges?: MenuCardBadge[];
  categorieNom?: string;
}

export interface MenuFilters {
  categorieId?: string;
  creneauId?: string;
  disponible?: boolean;
  search?: string;
  prixMin?: number;
  prixMax?: number;
}
