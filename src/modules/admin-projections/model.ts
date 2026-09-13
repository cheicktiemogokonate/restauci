export interface AdminPlatformStatsDTO {
  restaurants: {
    total: number;
    actifs: number;
    enAttente: number;
    suspendus: number;
  };
  usersTotal: number;
  clientsTotal: number;
  commandesAujourdhui: number;
  commandesMois: number;
  gmvMois: number;
  croissanceGmv: number | null;
  commissionsEnAttente: number;
}

export interface AdminActionCenterDTO {
  pendingRestaurants: number;
  pendingSubscriptions: number;
  expiringSubscriptions: number;
  commissionRestaurants: number;
  commissionsAmount: number;
  requiredActions: number;
}

export interface AdminActivityPointDTO {
  jour: string;
  count: number;
  gmv: number;
}

export interface AdminDashboardProjectionDTO {
  stats: AdminPlatformStatsDTO;
  actionCenter: AdminActionCenterDTO;
  activity: AdminActivityPointDTO[];
  generatedAt: Date;
}
