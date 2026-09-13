"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useAuthStore } from "../stores/auth-store";
import { tryRefreshToken } from "../api-client";

function subscribeToHydration(onStoreChange: () => void) {
  const unsubscribeHydrate = useAuthStore.persist.onHydrate(onStoreChange);
  const unsubscribeFinishHydration =
    useAuthStore.persist.onFinishHydration(onStoreChange);

  return () => {
    unsubscribeHydrate();
    unsubscribeFinishHydration();
  };
}

function getHydrationSnapshot() {
  return useAuthStore.persist.hasHydrated();
}

/**
 * À appeler une fois dans le layout client.
 * Si un refreshToken existe (persisté), régénère un accessToken
 * au chargement de l'app pour restaurer la session.
 */
export function useInitAuth() {
  const shouldRestoreSession = useAuthStore((s) => s.isAuthenticated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const logout = useAuthStore((s) => s.logout);
  const hasHydrated = useSyncExternalStore(
    subscribeToHydration,
    getHydrationSnapshot,
    () => false
  );

  useEffect(() => {
    if (!hasHydrated || !shouldRestoreSession || accessToken) {
      return;
    }

    let cancelled = false;

    const refreshSession = async () => {
      const success = await tryRefreshToken();
      if (cancelled) {
        return;
      }
      if (!success) {
        logout();
      }
    };

    refreshSession();

    return () => {
      cancelled = true;
    };
  }, [accessToken, hasHydrated, shouldRestoreSession, logout]);

  const isReady =
    hasHydrated && (!shouldRestoreSession || Boolean(accessToken));

  return { isReady };
}
