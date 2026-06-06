"use client";

import { useEffect } from "react";
import type { Commande } from "@/types";

export function useCommandesStream(
  restaurantId: string,
  onCommande: (commande: Commande) => void,
  onError?: (error: Event | string) => void,
  onOpen?: () => void
) {
  useEffect(() => {
    if (!restaurantId || typeof window === "undefined") {
      return;
    }

    const source = new EventSource(`/api/commandes/stream?restaurantId=${restaurantId}`);

    source.onopen = () => {
      if (onOpen) {
        onOpen();
      }
    };

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as Commande;
        onCommande(data);
      } catch (error) {
        console.error("Invalid SSE message:", error);
      }
    };

    source.onerror = (event) => {
      if (onError) {
        onError(event);
      }
      source.close();
    };

    return () => {
      source.close();
    };
  }, [restaurantId, onCommande, onError, onOpen]);
}
