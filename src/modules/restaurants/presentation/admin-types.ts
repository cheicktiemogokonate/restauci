import type {
  AdminRestaurantDetailDTO,
  AdminRestaurantListItemDTO,
} from "../contracts";

export type AdminRestaurantListItemViewModel = AdminRestaurantListItemDTO & {
  planCode: string;
  planNom: string;
  statutAbonnement: string | null;
  dateEcheance: string | null;
  tauxCommissionBpsFige: number;
};

export type AdminRestaurantDetailViewModel = AdminRestaurantDetailDTO & {
  effectivePlan: {
    plan: { nom: string };
  };
};

export interface AdminRestaurantOrderViewModel {
  id: string;
  numero: string;
  nomClient: string;
  statut: string;
  modeCommande: string;
  total: number;
  createdAt: Date | string;
}

export interface AdminRestaurantActions {
  validate: (restaurantId: string) => Promise<{ success: true } | { error: string }>;
  reject: (
    restaurantId: string,
    reason: string,
  ) => Promise<{ success: true } | { error: string }>;
  suspend: (
    restaurantId: string,
    reason: string,
  ) => Promise<{ success: true } | { error: string }>;
  reactivate: (
    restaurantId: string,
  ) => Promise<{ success: true } | { error: string }>;
}
