"use client";

import type { Commande } from "@/types";
import { useCallback, useEffect, useRef, useState } from "react";

const MAX_RETRIES = 5;
const BASE_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30000;

export function useCommandesStream(
  restaurantId: string,
  onCommande: (commande: Commande) => void,
  onError?: (error: Event | string) => void,
  onOpen?: () => void,
) {
  const [isConnected, setIsConnected] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const eventSourceRef = useRef<EventSource | null>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<number | undefined>(undefined);

  const connect = useCallback(
    function connect() {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      if (!restaurantId || typeof window === "undefined") {
        return;
      }

      const es = new EventSource(
        `/api/commandes/stream?restaurantId=${restaurantId}`,
        { withCredentials: true },
      );

      es.addEventListener("open", () => {
        setIsConnected(true);
        retryCountRef.current = 0;
        setRetryCount(0);
        onOpen?.();
      });

      es.addEventListener("message", (e) => {
        try {
          const data = JSON.parse(e.data) as Commande;
          onCommande(data);
        } catch {
          console.warn("[SSE] Erreur parsing message");
        }
      });

      es.addEventListener("ping", () => {
        // Keepalive — connexion active
      });

      es.addEventListener("close", () => {
        es.close();
        // Reconnexion après timeout serveur
        retryTimeoutRef.current = window.setTimeout(connect, 100);
      });

      es.addEventListener("error", () => {
        setIsConnected(false);
        es.close();

        const nextRetry = retryCountRef.current + 1;
        if (nextRetry > MAX_RETRIES) {
          onError?.("Nombre max de reconnexions atteint");
          return;
        }

        retryCountRef.current = nextRetry;
        setRetryCount(nextRetry);

        const delay = Math.min(
          BASE_RETRY_DELAY * Math.pow(2, nextRetry - 1),
          MAX_RETRY_DELAY,
        );

        onError?.(`Reconnexion dans ${delay / 1000}s...`);
        retryTimeoutRef.current = window.setTimeout(connect, delay);
      });

      eventSourceRef.current = es;
    },
    [restaurantId, onCommande, onError, onOpen],
  );

  useEffect(() => {
    connect();

    return () => {
      eventSourceRef.current?.close();
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [connect]);

  return { isConnected, retryCount };
}
