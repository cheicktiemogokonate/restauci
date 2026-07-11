"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "../stores/auth-store";
import { tryRefreshToken } from "../api-client";

/**
 * À appeler une fois dans le layout client.
 * Si un refreshToken existe (persisté), régénère un accessToken
 * au chargement de l'app pour restaurer la session.
 */
export function useInitAuth() {
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const [isReady, setIsReady] = useState(() => !refreshToken);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    if (!refreshToken) {
      return;
    }

    const refreshSession = async () => {
      const success = await tryRefreshToken();
      if (!success) {
        logout();
      }
      setIsReady(true);
    };

    refreshSession();
  }, [refreshToken, logout]);

  return { isReady };
}
