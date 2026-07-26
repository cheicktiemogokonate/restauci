"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SseEvent } from "@/types/commandes";

const BASE_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30000;

export function useCommandesStream(
  restaurantId: string,
  onEvent: (event: SseEvent) => void,
  onError?: (error: Event | string) => void,
  onOpen?: () => void,
  enabled: boolean = true
) {
  const [isConnected, setIsConnected] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const eventSourceRef = useRef<EventSource | null>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<number | undefined>(undefined);
  const lastEventIdRef = useRef<string | null>(null);

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

      const query = new URLSearchParams({ restaurantId });
      if (lastEventIdRef.current) query.set("cursor", lastEventIdRef.current);

      const es = new EventSource(
        `/api/commandes/stream?${query.toString()}`,
        { withCredentials: true },
      );

      es.addEventListener("open", () => {
        setIsConnected(true);
        retryCountRef.current = 0;
        setRetryCount(0);
        onOpenRef.current?.();
      });

      // Écouter tous les types d'événements nommés envoyés par le serveur
      const handleNamedEvent = (type: string) => (e: MessageEvent) => {
        try {
          if (e.lastEventId) lastEventIdRef.current = e.lastEventId;
          const data = JSON.parse(e.data as string);
          onEventRef.current({ type: type as SseEvent["type"], data });
        } catch {
          console.warn(`[SSE] Erreur parsing message pour ${type}`);
        }
      };

      es.addEventListener("nouvelle_commande", handleNamedEvent("nouvelle_commande"));
      es.addEventListener("commande_prete",    handleNamedEvent("commande_prete"));
      es.addEventListener("commande_annulee",  handleNamedEvent("commande_annulee"));
      es.addEventListener("nouveau_avis",      handleNamedEvent("nouveau_avis"));
      es.addEventListener("statut",            handleNamedEvent("statut"));
      es.addEventListener("livreur_assigne",   handleNamedEvent("livreur_assigne"));

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
        retryCountRef.current = nextRetry;
        setRetryCount(nextRetry);

        // Reconnexion indéfinie avec backoff exponentiel plafonné à
        // MAX_RETRY_DELAY. Ne jamais abandonner : une coupure réseau ou
        // un déploiement Vercel ne doit pas forcer un rechargement manuel.
        const delay = Math.min(
          BASE_RETRY_DELAY * Math.pow(2, Math.min(nextRetry - 1, 10)),
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

  useEffect(() => {
    const handleVisibility = () => {
      if (
        document.visibilityState === "visible" &&
        enabled &&
        !eventSourceRef.current
      ) {
        connect();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [connect, enabled]);

  return { isConnected, retryCount };
}
