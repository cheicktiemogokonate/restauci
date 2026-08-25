export const TTL = {
  RESTAURANT: 60 * 60,
  CATEGORIES: 60 * 30,
  PLATS: 60 * 15,
  COMMANDES: 60 * 2,
  STATS: 60 * 5,
  DASHBOARD: 60,
  NOTIFICATIONS: 60,
  RESTAURANT_PUBLIC: 60 * 60 * 24,
} as const;

export const cacheKey = {
  restaurantByUser: (userId: string) => `restauci:restaurant:user:${userId}`,
  restaurant: (id: string) => `restauci:restaurant:${id}`,
  restaurantPublic: (slug: string) => `restauci:restaurant:public:${slug}`,
  restaurantPublicMenu: (slug: string) => `restauci:public:menu:${slug}`,
  restaurantsPublicAll: () => `restauci:restaurants:public:all`,
  restaurantsPublicMarket: (serviceMarketId: string) =>
    `toutci:restaurants:public:market:${serviceMarketId}`,
  restaurantsPublicMarketsPattern: () =>
    "toutci:restaurants:public:market:*",
  categories: (restaurantId: string) => `restauci:categories:${restaurantId}`,
  creneauxRestaurant: (restaurantId: string) => `restauci:creneaux:${restaurantId}`,
  plats: (restaurantId: string, page: number, categorieId?: string | null, disponible?: boolean | null, search?: string) =>
    `restauci:plats:${restaurantId}:${page}:${categorieId ?? "all"}:${disponible === undefined ? "all" : disponible}:${search ?? "all"}`,
  plat: (id: string) => `restauci:plat:${id}`,
  topPlats: (restaurantId: string, limit: number) => `restauci:top-plats:${restaurantId}:${limit}`,
  commandes: (restaurantId: string, page: number, statut?: string, modeCommande?: string, dateDebut?: string, dateFin?: string, search?: string) =>
    `restauci:commandes:${restaurantId}:${page}:${statut ?? "all"}:${modeCommande ?? "all"}:${dateDebut ?? "all"}:${dateFin ?? "all"}:${search ?? "all"}`,
  stats: (restaurantId: string) => `restauci:stats:${restaurantId}`,
  dashboardDaily: (restaurantId: string, jours: number) => `restauci:dashboard:daily:${restaurantId}:${jours}`,
  dashboardModes: (restaurantId: string) => `restauci:dashboard:modes:${restaurantId}`,
  notifications: (userId: string) => `restauci:notifications:${userId}`,
} as const;
