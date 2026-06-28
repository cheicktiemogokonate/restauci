"use client";

import type { Notification } from "@/lib/db/types";
import Link from "next/link";
import { useState } from "react";

interface NotificationsClientProps {
  initialNotifications: Notification[];
  initialUnreadCount: number;
}

function getNotificationHref(notification: Notification): string {
  if (!notification.lienType || !notification.lienId) return "#";
  switch (notification.lienType) {
    case "commande":
      return `/restaurateur/commandes/${notification.lienId}`;
    default:
      return "#";
  }
}

function getNotificationIcon(type: string): string {
  switch (type) {
    case "nouvelle_commande":
      return "U";
    case "commande_prete":
      return "C";
    case "commande_annulee":
      return "X";
    case "nouveau_avis":
      return "M";
    default:
      return "B";
  }
}

export function NotificationsClient({
  initialNotifications,
  initialUnreadCount,
}: NotificationsClientProps) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds: [id] }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, lue: true, lueAt: new Date() } : n,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("[NotificationsClient] Failed to mark as read:", err);
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.lue).map((n) => n.id);
    if (unreadIds.length === 0) return;
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds: unreadIds }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setNotifications((prev) =>
        prev.map((n) => (!n.lue ? { ...n, lue: true, lueAt: new Date() } : n)),
      );
      setUnreadCount(0);
    } catch (err) {
      console.error("[NotificationsClient] Failed to mark all as read:", err);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium 
                ${unreadCount === 0 ? "text-gray-400 bg-gray-50" : "text-white bg-primary"} 
                rounded-md transition-colors`}
            >
              {unreadCount > 0 && (
                <span className="bg-red-100 text-red-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
              Marquer tout comme lu
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {notifications.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="h-10 w-10 text-gray-400 mx-auto mb-4"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-lg text-gray-500">Aucune notification</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="shrink-0 mt-0.5">
                    <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-medium">
                      {getNotificationIcon(notification.type).charAt(0)}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <h3
                        className={`font-semibold 
                          ${notification.lue ? "text-gray-900" : "text-primary font-bold"}`}
                      >
                        {notification.titre}
                      </h3>
                      <time className="text-xs text-gray-500">
                        {new Date(notification.createdAt).toLocaleString(
                          "fr-FR",
                          { dateStyle: "short", timeStyle: "short" },
                        )}
                      </time>
                    </div>

                    <p className="text-sm text-gray-600 line-clamp-2">
                      {notification.message}
                    </p>

                    {notification.lienType && notification.lienId && (
                      <div className="mt-3">
                        <Link
                          href={getNotificationHref(notification)}
                          className={`inline-flex items-center px-3 py-1.5 text-sm font-medium 
                            ${notification.lue ? "text-gray-600 hover:text-gray-900" : "text-primary hover:text-primary/80"}
                            bg-gray-50
                            rounded-md
                          `}
                        >
                          Voir la commande
                        </Link>
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 mt-2">
                    <button
                      onClick={() => markAsRead(notification.id)}
                      disabled={notification.lue}
                      className={`flex h-8 w-8 items-center justify-center 
                        ${notification.lue ? "text-gray-400" : "text-primary"} 
                        bg-gray-50
                        rounded-full hover:bg-gray-100
                        transition-colors`}
                    >
                      {!notification.lue && (
                        <svg
                          className="h-4 w-4"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                      {notification.lue && (
                        <svg
                          className="h-4 w-4"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 12l7 7 7-7"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {!notification.lue && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Envoyé le</span>
                      <span className="text-gray-600 font-medium">
                        {new Date(notification.createdAt).toLocaleString(
                          "fr-FR",
                          { dateStyle: "short", timeStyle: "short" },
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
