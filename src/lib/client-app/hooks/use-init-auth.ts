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
  const shouldRestoreSession = useAuthStore((s) => s.isAuthenticated);
  const [isReady, setIsReady] = useState(() => !shouldRestoreSession);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    if (!shouldRestoreSession) {
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
  }, [shouldRestoreSession, logout]);

  return { isReady };
}
