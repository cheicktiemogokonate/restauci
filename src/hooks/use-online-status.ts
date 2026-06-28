"use client";

import { useEffect, useState } from "react";

interface OnlineStatus {
  isOnline: boolean;
  wasOffline: boolean;
}

/**
 * Hook qui détecte l'état de la connexion réseau.
 * - isOnline : true si connecté, false si hors ligne
 * - wasOffline : true pendant 3 secondes après le retour en ligne
 *   (pour afficher un message "Connexion rétablie")
 */
export function useOnlineStatus(): OnlineStatus {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [wasOffline, setWasOffline] = useState<boolean>(false);

  useEffect(() => {
    let timer: number | undefined;

    const handleOnline = () => {
      setIsOnline(true);
      setWasOffline(true);

      timer = window.setTimeout(() => {
        setWasOffline(false);
      }, 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(false);
      if (timer) {
        clearTimeout(timer);
        timer = undefined;
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (timer) clearTimeout(timer);
    };
  }, []);

  return { isOnline, wasOffline };
}
