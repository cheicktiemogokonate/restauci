"use client";

import { useRealtimeContext } from "@/components/dashboard/layout/dashboard-realtime-provider";
import { useNotificationsContext } from "@/components/dashboard/notifications/notifications-provider";
import { Button } from "@/components/ui/button";
import type { Notification } from "@/lib/db/types";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

function getNotificationHref(notification: Notification): string {
  switch (notification.lienType) {
    case "commande":
      return notification.lienId
        ? `/restaurateur/commandes/${notification.lienId}`
        : "/restaurateur/commandes";
    case "profil":
      return "/restaurateur/profil";
    case "restaurant":
      return "/restaurateur";
    default:
      return "#";
  }
}

function getNotificationLinkLabel(notification: Notification): string {
  if (notification.lienType === "commande") return "Voir la commande";
  if (notification.lienType === "profil") return "Corriger mon dossier";
  return "Voir mon tableau de bord";
}

function getNotificationIcon(type: string): string {
  switch (type) {
    case "nouvelle_commande":
      return "🛒";
    case "commande_prete":
      return "✅";
    case "commande_annulee":
      return "❌";
    case "nouveau_avis":
      return "⭐";
    case "restaurant_valide":
      return "🎉";
    case "restaurant_rejete":
      return "📝";
    default:
      return "🔔";
  }
}

/** Contexte audio partagé, déverrouillé à la première interaction */
let _audioCtx: AudioContext | null = null;
let _audioUnlocked = false;

function unlockAudio() {
  if (_audioUnlocked) return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    _audioCtx = new AudioCtx();
    const buf = _audioCtx.createBuffer(1, 1, 22050);
    const src = _audioCtx.createBufferSource();
    src.buffer = buf;
    src.connect(_audioCtx.destination);
    src.start(0);
    _audioUnlocked = true;
  } catch {
    /* silencieux */
  }
}

/** Joue un bip sonore via Web Audio API pour signaler une nouvelle notification */
function playNotificationSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = _audioCtx ?? new AudioCtx();
    if (!_audioCtx) _audioCtx = ctx;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});

    const beep = (startTime: number, freq: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
      osc.start(startTime);
      osc.stop(startTime + 0.3);
    };
    beep(ctx.currentTime, 880);
    beep(ctx.currentTime + 0.35, 660);
  } catch {
    // Web Audio API non disponible, on ignore silencieusement
  }
}

// Types d'événements SSE pertinents pour les notifications.
const NOTIFICATION_TRIGGER_TYPES = new Set([
  "nouvelle_commande",
  "commande_prete",
  "commande_annulee",
  "nouveau_avis",
  "restaurant_valide",
  "restaurant_rejete",
]);

// Types déjà gérés par le DashboardRealtimeProvider (toast + son + refresh).
// On les saute ICI pour éviter tout doublon son/toast. On continue quand
// même de rafraîchir la liste (via le contexte) — seuls le son et le toast
// sont filtrés. `nouveau_avis` reste géré ici (le provider ne le traite pas).
const SKIP_SOUND_FOR = new Set([
  "nouvelle_commande",
  "commande_prete",
  "commande_annulee",
  "restaurant_valide",
  "restaurant_rejete",
]);

export function NotificationsClient() {
  // État et actions centralisés dans le NotificationsProvider. Toute action
  // ici (markAsRead / markAllAsRead) se propage immédiatement à tous les
  // consommateurs du contexte (navbar incluse) — c'est la synchronisation
  // attendue entre composants.
  const {
    notifications,
    unreadCount,
    isRefreshing,
    markAsRead,
    markAllAsRead,
    refresh,
  } = useNotificationsContext();
  const { latestEvent } = useRealtimeContext();

  // Référence au plus récent ID connu pour détecter les nouvelles notifs
  // (pour le son/toast spécifique à `nouveau_avis` non géré par le provider).
  const lastTopIdRef = useRef<string | null>(
    notifications.length > 0 ? notifications[0].id : null,
  );
  const currentIdsRef = useRef<Set<string>>(
    new Set(notifications.map((n) => n.id)),
  );

  // Déverrouiller l'audio à la première interaction
  useEffect(() => {
    const unlock = () => {
      unlockAudio();
      window.removeEventListener("click", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("click", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("click", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  // Détection locale des nouvelles notifications (son + toast) pour les types
  // NON gérés par le DashboardRealtimeProvider (ex: `nouveau_avis`). Les types
  // déjà traités par le provider sont filtrés via SKIP_SOUND_FOR.
  useEffect(() => {
    if (!latestEvent || !NOTIFICATION_TRIGGER_TYPES.has(latestEvent.type))
      return;

    // Détecte les nouvelles notifs apparues dans la liste (raffraîchie par le
    // provider via le même latestEvent).
    if (notifications.length > 0) {
      const latestId = notifications[0].id;
      if (lastTopIdRef.current && latestId !== lastTopIdRef.current) {
        const brandNewNotifs = notifications.filter(
          (n) => !currentIdsRef.current.has(n.id),
        );
        const notifsForSound = brandNewNotifs.filter(
          (n) => !SKIP_SOUND_FOR.has(n.type),
        );

        if (notifsForSound.length > 0) {
          playNotificationSound();
          notifsForSound.slice(0, 3).forEach((notif) => {
            toast(getNotificationIcon(notif.type) + " " + notif.titre, {
              description: notif.message,
              duration: 6000,
            });
          });
        }
      }
      lastTopIdRef.current = latestId;
    }
    currentIdsRef.current = new Set(notifications.map((n) => n.id));
  }, [latestEvent, notifications]);

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Bouton actualisation manuelle */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => refresh(false)}
              disabled={isRefreshing}
              aria-label="Actualiser"
            >
              <svg
                className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </Button>
            {/* Marquer tout comme lu */}
            <Button
              type="button"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
            >
              Marquer tout comme lu
            </Button>
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
                className={`border rounded-lg p-4 transition-colors ${
                  notification.lue
                    ? "bg-white hover:bg-gray-50"
                    : "bg-blue-50 border-blue-200 hover:bg-blue-100"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="shrink-0 mt-0.5">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-base">
                      {getNotificationIcon(notification.type)}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <h3
                        className={`font-semibold ${
                          notification.lue
                            ? "text-gray-900"
                            : "text-primary font-bold"
                        }`}
                      >
                        {notification.titre}
                        {!notification.lue && (
                          <span className="ml-2 inline-block w-2 h-2 rounded-full bg-blue-500 align-middle" />
                        )}
                      </h3>
                      <time className="text-xs text-gray-500 ml-2 shrink-0">
                        {new Date(notification.createdAt).toLocaleString(
                          "fr-FR",
                          {
                            dateStyle: "short",
                            timeStyle: "short",
                          },
                        )}
                      </time>
                    </div>

                    <p className="text-sm text-gray-600 line-clamp-2">
                      {notification.message}
                    </p>

                    {getNotificationHref(notification) !== "#" && (
                      <div className="mt-3">
                        <Button asChild variant="outline" size="sm">
                          <Link href={getNotificationHref(notification)}>
                            {getNotificationLinkLabel(notification)} →
                          </Link>
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 mt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => markAsRead(notification.id)}
                      disabled={notification.lue}
                      aria-label={notification.lue ? "Déjà lu" : "Marquer comme lu"}
                    >
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="none"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
