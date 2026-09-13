export const PAGINATION = {
  // Dashboard restaurateur
  COMMANDES_PAR_PAGE:  20,
  PLATS_PAR_PAGE:      24,
  CATEGORIES_PAR_PAGE: 50,
  AVIS_PAR_PAGE:       10,
  CLIENTS_PAR_PAGE:    20,
  NOTIFICATIONS_PAR_PAGE: 30,

  // API publique (app mobile)
  API_PLATS_PAR_PAGE:  20,
  API_COMMANDES_PAR_PAGE: 10,

  // Valeur max absolue — jamais plus que ça même si le client demande
  MAX_PAR_PAGE: 100,
} as const;

export function parsePage(pageParam: string | undefined): number {
  const page = parseInt(pageParam ?? "1", 10);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function parseLimit(limitParam: string | undefined, defaultLimit: number): number {
  const limit = parseInt(limitParam ?? String(defaultLimit), 10);
  if (!Number.isInteger(limit) || limit < 1) {
    return defaultLimit;
  }
  return Math.min(limit, PAGINATION.MAX_PAR_PAGE);
}

export function getOffset(page: number, limit: number): number {
  return Math.max(0, (page - 1) * limit);
}

export function buildPaginationMeta(total: number, page: number, limit: number): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

export interface PaginationMeta {
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
  hasNext:    boolean;
  hasPrev:    boolean;
}
