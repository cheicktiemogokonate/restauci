"use client";

import { useAuthStore } from "./stores/auth-store";

const API_BASE = "/api/v1/client";

export interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Wrapper fetch qui ajoute automatiquement le token Bearer
 * et gère le refresh automatique si le token est expiré (401).
 */
async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  retry = true
): Promise<ApiResult<T>> {
  const { accessToken } = useAuthStore.getState();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers ?? {}),
  };

  if (accessToken) {
    (headers as Record<string, string>).Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  // Token expiré — tenter un refresh une seule fois
  if (response.status === 401 && retry) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      return apiFetch<T>(path, options, false);
    }
    // Refresh échoué — déconnecter
    useAuthStore.getState().logout();
  }

  const json = await response.json().catch(() => null);
  return json ?? { success: false, error: "Réponse invalide du serveur" };
}

async function tryRefreshToken(): Promise<boolean> {
  const { refreshToken } = useAuthStore.getState();
  if (!refreshToken) return false;

  try {
    const response = await fetch("/api/v1/client/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    const json = await response.json();
    if (json.success && json.data?.accessToken) {
      useAuthStore.getState().setAccessToken(json.data.accessToken);
      return true;
    }
  } catch {
    // Échec silencieux — le logout sera géré par l'appelant
  }
  return false;
}

// ─── HELPERS PAR MÉTHODE ─────────────────────────────────────────────────────

export const clientApi = {
  get: <T>(path: string) => apiFetch<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
};
