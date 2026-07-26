"use client";

/**
 * NotificationsProvider
 *
 * Contexte unique pour l'état des notifications du dashboard (liste + compteur
 * non lues). Centralise les actions `markAsRead` / `markAllAsRead` / `refresh`
 * afin que TOUS les consommateurs (navbar, page notifications, etc.) restent
 * synchronisés sans chacun refetcher séparément.
 *
 * Synchronisation temps réel : ce provider écoute `latestEvent` du
 * `RealtimeContext` (SSE) et rafraîchit automatiquement son état quand un
 * événement pertinent arrive (nouvelle_commande, commande_prete,
 * commande_annulee, nouveau_avis). Pas de polling.
 *
 * Quand une notification est marquée comme lue, le nouveau compteur est
 * propagé immédiatement à tous les consommateurs via le contexte.
 */

import { useRealtimeContext } from "@/components/dashboard/layout/dashboard-realtime-provider";
import type { Notification } from "@/lib/db/types";
import { useCallback, createContext, useContext, useEffect, useRef, useState } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface NotificationsContextValue {
  notifications: Notification[];
  unreadCount: number;
  isRefreshing: boolean;
  /** Marque une notification comme lue (optimiste + PATCH API). */
  markAsRead: (id: string) => Promise<void>;
  /** Marque toutes les notifications affichées comme lues. */
  markAllAsRead: () => Promise<void>;
  /** Recharge la liste depuis l'API. */
  refresh: (silent?: boolean) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function useNotificationsContext(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error(
      "useNotificationsContext doit être utilisé à l'intérieur d'un NotificationsProvider",
    );
  }
  return ctx;
}

// ─── Constantes ──────────────────────────────────────────────────────────────

// Types d'événements SSE qui doivent déclencher un rafraîchissement.
const NOTIFICATION_TRIGGER_TYPES = new Set([
  "nouvelle_commande",
  "commande_prete",
  "commande_annulee",
  "nouveau_avis",
]);

// Débounce pour éviter les fetchs en rafale si plusieurs événements arrivent
// d'affilée (import en masse, tests, etc.).
const FETCH_DEBOUNCE_MS = 400;

// ─── Provider ────────────────────────────────────────────────────────────────

interface NotificationsProviderProps {
  initialNotifications: Notification[];
  initialUnreadCount: number;
  children: React.ReactNode;
}

export function NotificationsProvider({
  initialNotifications,
  initialUnreadCount,
  children,
}: NotificationsProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { latestEvent } = useRealtimeContext();

  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Refetch complet de la liste (avec compteur frais) depuis l'API. */
  const refresh = useCallback(async (silent = true) => {
    if (!silent) setIsRefreshing(true);
    try {
      const res = await fetch("/api/notifications?limit=50", {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        notifications: Notification[];
        unreadCount: number;
      };
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      console.error("[NotificationsProvider] Erreur de rafraîchissement:", err);
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  }, []);

  // Rafraîchissement temps réel sur événement SSE pertinent.
  useEffect(() => {
    if (!latestEvent || !NOTIFICATION_TRIGGER_TYPES.has(latestEvent.type)) return;

    if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    fetchTimeoutRef.current = setTimeout(() => {
      void refresh(true);
    }, FETCH_DEBOUNCE_MS);

    return () => {
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    };
  }, [latestEvent, refresh]);

  const markAsRead = useCallback(async (id: string) => {
    // Mise à jour optimiste : on ajuste immédiatement l'état local pour que
    // tous les consommateurs (navbar, page notifications) réagissent sans
    // attendre le refetch complet.
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, lue: true, lueAt: new Date() } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds: [id] }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      console.error("[NotificationsProvider] markAsRead failed:", err);
      // En cas d'erreur, on resynchronise depuis le serveur pour éviter un
      // état incohérent.
      void refresh(true);
    }
  }, [refresh]);

  const markAllAsRead = useCallback(async () => {
    const unreadIds = notifications.filter((n) => !n.lue).map((n) => n.id);
    if (unreadIds.length === 0) return;

    // Mise à jour optimiste
    setNotifications((prev) =>
      prev.map((n) => (!n.lue ? { ...n, lue: true, lueAt: new Date() } : n)),
    );
    setUnreadCount(0);

    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds: unreadIds }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      console.error("[NotificationsProvider] markAllAsRead failed:", err);
      void refresh(true);
    }
  }, [notifications, refresh]);

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        isRefreshing,
        markAsRead,
        markAllAsRead,
        refresh,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}
