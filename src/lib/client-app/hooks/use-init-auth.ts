"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "../stores/auth-store";

/**
 * À appeler une fois dans le layout client.
 * Si un refreshToken existe (persisté), régénère un accessToken
 * au chargement de l'app pour restaurer la session.
 */
export function useInitAuth() {
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const [isReady, setIsReady] = useState(() => !refreshToken);
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    if (!refreshToken) {
      return;
    }

    const refreshSession = async () => {
      try {
        const response = await fetch("/api/v1/client/auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
          throw new Error("Échec du refresh de session");
        }

        const json = await response.json().catch(() => null);
        if (json?.success && json.data?.accessToken) {
          setAccessToken(json.data.accessToken);
        } else {
          logout();
        }
      } catch {
        logout();
      } finally {
        setIsReady(true);
      }
    };

    refreshSession();
  }, [refreshToken, logout, setAccessToken]);

  return { isReady };
}
