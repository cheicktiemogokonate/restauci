"use client";

import { useEffect, useRef, useState } from "react";
import { clientApi } from "../api-client";
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

export function useCommandeTracking(commandeId: string) {
  const [commande, setCommande] = useState<CommandeTracking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    const initialize = async () => {
      if (!commandeId || !accessToken) {
        setCommande(null);
        setError("Identifiant de commande ou jeton manquant.");
        setIsLoading(false);
        return;
      }

      let isActive = true;
      setIsLoading(true);
      setError(null);

      clientApi
        .get<CommandeTracking>(`/commandes/${commandeId}`)
        .then((result) => {
          if (!isActive) return;
          if (result.success && result.data) {
            setCommande(result.data);
          } else {
            setCommande(null);
            setError(result.error ?? "Impossible de charger la commande.");
          }
        })
        .catch(() => {
          if (isActive) {
            setCommande(null);
            setError("Impossible de charger la commande.");
          }
        })
        .finally(() => {
          if (isActive) setIsLoading(false);
        });

      return () => {
        isActive = false;
      };
    };

    void Promise.resolve().then(initialize);
  }, [commandeId, accessToken]);

  useEffect(() => {
    if (!commandeId || !accessToken) return;

    // EventSource natif ne supporte pas les headers custom.
    // On passe le token en query param pour ce cas précis
    // (la route SSE doit aussi accepter ?token=... en plus du header Bearer
    // — vérifie ce point côté API, sinon adapte la route stream
    // pour lire le token depuis searchParams).
    const url = `/api/v1/client/commandes/${commandeId}/stream?token=${accessToken}`;
    let isMounted = true;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const createEventSource = () => {
      const es = new EventSource(url);

      es.addEventListener("statut", async (event) => {
        if (!isMounted) return;

        const payload = JSON.parse(event.data);
        setCommande((prev) =>
          prev ? { ...prev, statut: payload.statut } : prev,
        );

        const result = await clientApi.get<CommandeTracking>(
          `/commandes/${commandeId}`,
        );
        if (!isMounted) return;
        if (result.success && result.data) {
          setCommande(result.data);
        } else {
          setError(
            result.error ?? "Impossible de récupérer l'état de la commande.",
          );
        }
      });

      es.addEventListener("fin", () => {
        if (!isMounted) return;
        es.close();
      });

      es.addEventListener("close", (event) => {
        if (!isMounted) return;
        const payload = JSON.parse(event.data);
        if (payload?.reconnect) {
          reconnectTimer = setTimeout(() => {
            if (!isMounted) return;
            eventSourceRef.current?.close();
            eventSourceRef.current = createEventSource();
          }, 500);
        }
      });

      es.onerror = () => {
        if (!isMounted) return;
        setError("Connexion temps réel interrompue.");
      };

      return es;
    };

    eventSourceRef.current = createEventSource();

    return () => {
      isMounted = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      eventSourceRef.current?.close();
    };
  }, [commandeId, accessToken]);

  return { commande, isLoading, error };
}
