export interface DashboardRoute {
  path: string;
  titre: string;
  showBackButton: boolean;
  parentPath?: string;
}

export const DASHBOARD_ROUTES: DashboardRoute[] = [
  {
    path: "/restaurateur",
    titre: "Tableau de bord",
    showBackButton: false,
  },
  {
    path: "/restaurateur/commandes",
    titre: "Commandes",
    showBackButton: false,
  },
  {
    path: "/restaurateur/commandes/",  // route dynamique [id]
    titre: "Détail de la commande",
    showBackButton: true,
    parentPath: "/restaurateur/commandes",
  },
  {
    path: "/restaurateur/menu",
    titre: "Menu",
    showBackButton: false,
  },
  {
    path: "/restaurateur/menu/new",
    titre: "Nouveau plat",
    showBackButton: true,
    parentPath: "/restaurateur/menu",
  },
  {
    path: "/restaurateur/menu/",  // route dynamique [id]
    titre: "Détail du plat",
    showBackButton: true,
    parentPath: "/restaurateur/menu",
  },
  {
    path: "/restaurateur/profil",
    titre: "Mon profil",
    showBackButton: false,
  },
  {
    path: "/admin",
    titre: "Administration",
    showBackButton: false,
  },
  {
    path: "/admin/restaurants",
    titre: "Gestion des restaurants",
    showBackButton: false,
  },
];

/**
 * Retourne la config de route correspondant au pathname
 */
export function getRouteConfig(pathname: string): DashboardRoute | null {
  // Correspondance exacte d'abord
  const exact = DASHBOARD_ROUTES.find((r) => r.path === pathname);
  if (exact) return exact;

  // Correspondance partielle pour les routes dynamiques
  const partial = DASHBOARD_ROUTES.find(
    (r) => r.path !== "/" && r.path.endsWith("/") && pathname.startsWith(r.path)
  );
  return partial ?? null;
}
