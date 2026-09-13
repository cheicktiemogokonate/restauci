"use client";

const API_BASE = "/api/v1/livreur";

export interface DriverApiResult<T> {
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

let accessToken: string | null = null;
let refreshPromise: Promise<boolean> | null = null;

export function setDriverAccessToken(token: string | null) {
  accessToken = token;
}

export async function refreshDriverAccess(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenTransport: "cookie" }),
      });
      const json = (await response.json().catch(() => null)) as DriverApiResult<{
        accessToken: string;
      }> | null;
      if (json?.success && json.data?.accessToken) {
        accessToken = json.data.accessToken;
        return true;
      }
    } catch {
      // L'écran de connexion prend le relais.
    }
    accessToken = null;
    return false;
  })().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

async function driverFetch<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<DriverApiResult<T>> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (response.status === 401 && retry && !path.startsWith("/auth/")) {
    if (await refreshDriverAccess()) return driverFetch<T>(path, options, false);
  }
  const json = (await response.json().catch(() => null)) as DriverApiResult<T> | null;
  return json ?? { success: false, error: "Réponse invalide du serveur." };
}

export const driverApi = {
  get: <T>(path: string) => driverFetch<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    driverFetch<T>(path, {
      method: "POST",
      body: JSON.stringify(body ?? {}),
    }),
  patch: <T>(path: string, body: unknown) =>
    driverFetch<T>(path, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
};
