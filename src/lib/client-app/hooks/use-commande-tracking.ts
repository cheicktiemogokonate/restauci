"use client";

import { useEffect, useState } from "react";
import { clientApi, tryRefreshToken } from "../api-client";
import { useAuthStore } from "../stores/auth-store";

export interface TimelineEtape {
  etape: string;
  label: string;
  fait: boolean;
  actif: boolean;
  timestamp: string | null;
}

export interface CommandeTracking {
  id: string;
  numero: string;
  statut: string;
  statutLabel: string;
  estAnnulee: boolean;
  timeline: TimelineEtape[];
  total: number;
  items: Array<{ nom: string; prix: number; quantite: number }>;
  restaurant: { nom: string; logoUrl?: string | null } | null;
  modeCommande: string;
  adresseLivraison?: string | null;
  numeroTable?: string | null;
}

type SseMessage = { event: string; data: unknown };

function parseSseChunk(buffer: string): {
  messages: SseMessage[];
  remainder: string;
} {
  const blocks = buffer.split("\n\n");
  const remainder = blocks.pop() ?? "";
  const messages = blocks.flatMap((block) => {
    let event = "message";
    const dataLines: string[] = [];
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
    }
    if (dataLines.length === 0) return [];
    try {
      return [{ event, data: JSON.parse(dataLines.join("\n")) }];
    } catch {
      return [];
    }
  });
  return { messages, remainder };
}

export function useCommandeTracking(commandeId: string) {
  const [commande, setCommande] = useState<CommandeTracking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const accessToken = useAuthStore((state) => state.accessToken);

  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(() => {
        if (active) {
          setIsLoading(true);
          setError(null);
        }
      })
      .then(() => clientApi
      .get<CommandeTracking>(`/commandes/${commandeId}`)
      .then((result) => {
        if (!active) return;
        if (result.success && result.data) setCommande(result.data);
        else setError(result.error ?? "Impossible de charger la commande.");
      })
      .catch(() => {
        if (active) setError("Impossible de charger la commande.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      }));
    return () => {
      active = false;
    };
  }, [commandeId, accessToken]);

  useEffect(() => {
    if (!commandeId || !accessToken) return;
    const controller = new AbortController();
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    const refreshCommande = async () => {
      const result = await clientApi.get<CommandeTracking>(
        `/commandes/${commandeId}`,
      );
      if (!controller.signal.aborted && result.success && result.data) {
        setCommande(result.data);
        setError(null);
      }
    };

    const connect = async () => {
      const token = useAuthStore.getState().accessToken;
      if (!token || controller.signal.aborted) return;
      try {
        let response = await fetch(
          `/api/v1/client/commandes/${commandeId}/stream`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          },
        );
        if (response.status === 401 && (await tryRefreshToken())) {
          const refreshedToken = useAuthStore.getState().accessToken;
          response = await fetch(
            `/api/v1/client/commandes/${commandeId}/stream`,
            {
              headers: { Authorization: `Bearer ${refreshedToken}` },
              signal: controller.signal,
            },
          );
        }
        if (!response.ok || !response.body) throw new Error("Stream indisponible");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let shouldReconnect = true;
        while (!controller.signal.aborted) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
          const parsed = parseSseChunk(buffer);
          buffer = parsed.remainder;
          for (const message of parsed.messages) {
            if (message.event === "statut") await refreshCommande();
            if (message.event === "fin") shouldReconnect = false;
            if (message.event === "close") shouldReconnect = true;
          }
        }
        if (shouldReconnect && !controller.signal.aborted) {
          reconnectTimer = setTimeout(connect, 1_000);
        }
      } catch {
        if (!controller.signal.aborted) {
          setError("Connexion temps réel interrompue. Nouvelle tentative…");
          reconnectTimer = setTimeout(connect, 2_000);
        }
      }
    };

    void connect();
    return () => {
      controller.abort();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [commandeId, accessToken]);

  return { commande, isLoading, error };
}
