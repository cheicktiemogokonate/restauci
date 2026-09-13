"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useOptionalRealtimeContext } from "@/components/dashboard/layout/dashboard-realtime-provider";
import type { NotificationDTO } from "../model";

interface NotificationsContextValue {
  notifications: NotificationDTO[];
  unreadCount: number;
  isRefreshing: boolean;
  error: string | null;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: (silent?: boolean) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null,
);

export function useNotificationsContext() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error(
      "useNotificationsContext doit être utilisé dans NotificationsProvider",
    );
  }
  return context;
}

const REALTIME_NOTIFICATION_TYPES = new Set([
  "nouvelle_commande",
  "commande_prete",
  "commande_annulee",
  "restaurant_valide",
  "restaurant_rejete",
]);

export function NotificationsProvider({
  initialNotifications,
  initialUnreadCount,
  children,
}: {
  initialNotifications: NotificationDTO[];
  initialUnreadCount: number;
  children: React.ReactNode;
}) {
  const [notifications, setNotifications] =
    useState<NotificationDTO[]>(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestEvent = useOptionalRealtimeContext()?.latestEvent ?? null;
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async (silent = true) => {
    if (!silent) setIsRefreshing(true);
    setError(null);
    try {
      const response = await fetch("/api/notifications?limit=50", {
        credentials: "include",
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as {
        notifications: NotificationDTO[];
        unreadCount: number;
      };
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      setError("Les notifications n’ont pas pu être actualisées.");
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!latestEvent || !REALTIME_NOTIFICATION_TYPES.has(latestEvent.type)) {
      return;
    }
    if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    fetchTimeoutRef.current = setTimeout(() => void refresh(true), 400);
    return () => {
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    };
  }, [latestEvent, refresh]);

  const markAsRead = useCallback(
    async (id: string) => {
      const target = notifications.find((item) => item.id === id);
      if (!target || target.lue) return;
      setNotifications((items) =>
        items.map((item) =>
          item.id === id ? { ...item, lue: true, lueAt: new Date() } : item,
        ),
      );
      setUnreadCount((count) => Math.max(0, count - 1));
      try {
        const response = await fetch("/api/notifications", {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notificationIds: [id] }),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
      } catch {
        setError("La notification n’a pas pu être marquée comme lue.");
        void refresh(true);
      }
    },
    [notifications, refresh],
  );

  const markAllAsRead = useCallback(async () => {
    const notificationIds = notifications
      .filter((item) => !item.lue)
      .map((item) => item.id);
    if (notificationIds.length === 0) return;
    setNotifications((items) =>
      items.map((item) =>
        item.lue ? item : { ...item, lue: true, lueAt: new Date() },
      ),
    );
    setUnreadCount(0);
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
    } catch {
      setError("Les notifications n’ont pas pu être marquées comme lues.");
      void refresh(true);
    }
  }, [notifications, refresh]);

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        isRefreshing,
        error,
        markAsRead,
        markAllAsRead,
        refresh,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}
