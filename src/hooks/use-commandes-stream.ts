"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MAX_RETRIES = 5;
const BASE_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30000;

export function useCommandesStream(
  restaurantId: string,
  onEvent: (type: string, data: unknown) => void,
  onError?: (error: Event | string) => void,
  onOpen?: () => void,
  enabled: boolean = true
) {
  const [isConnected, setIsConnected] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const eventSourceRef = useRef<EventSource | null>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<number | undefined>(undefined);

  // Stocker les callbacks dans des refs pour éviter de recréer `connect`
  // à chaque re-render (ce qui causerait une boucle de reconnexions)
  const onEventRef = useRef(onEvent);
  const onErrorRef = useRef(onError);
  const onOpenRef = useRef(onOpen);

  useEffect(() => { onEventRef.current = onEvent; }, [onEvent]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);
  useEffect(() => { onOpenRef.current = onOpen; }, [onOpen]);

  const connect = useCallback(
    function connect() {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      if (!restaurantId || typeof window === "undefined" || !enabled) {
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
        onOpenRef.current?.();
        console.log("[SSE] Connexion ouverte");
      });

      // Écouter tous les types d'événements nommés envoyés par le serveur
      const handleNamedEvent = (type: string) => (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data as string);
          console.log(`[SSE] Événement reçu: ${type}`, data);
          onEventRef.current(type, data);
        } catch {
          console.warn(`[SSE] Erreur parsing message pour ${type}`);
        }
      };

      es.addEventListener("nouvelle_commande", handleNamedEvent("nouvelle_commande"));
      es.addEventListener("commande_prete",    handleNamedEvent("commande_prete"));
      es.addEventListener("commande_annulee",  handleNamedEvent("commande_annulee"));
      es.addEventListener("nouveau_avis",      handleNamedEvent("nouveau_avis"));
      es.addEventListener("statut",            handleNamedEvent("statut"));

      // Fallback : événement générique `message` (au cas où le serveur en envoie)
      es.addEventListener("message", handleNamedEvent("message"));

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
          onErrorRef.current?.("Nombre max de reconnexions atteint");
          return;
        }

        retryCountRef.current = nextRetry;
        setRetryCount(nextRetry);

        const delay = Math.min(
          BASE_RETRY_DELAY * Math.pow(2, nextRetry - 1),
          MAX_RETRY_DELAY,
        );

        onErrorRef.current?.(`Reconnexion dans ${delay / 1000}s...`);
        retryTimeoutRef.current = window.setTimeout(connect, delay);
      });

      eventSourceRef.current = es;
    },
    // IMPORTANT : seulement restaurantId et enabled comme dépendances
    // Les callbacks sont dans des refs, donc `connect` ne se recrée pas
    // à chaque changement de callback.
    [restaurantId, enabled],
  );

  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    }

    return () => {
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [connect, enabled]);

  return { isConnected, retryCount };
}
