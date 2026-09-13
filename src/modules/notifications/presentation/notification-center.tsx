"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Check,
  CheckCheck,
  CircleAlert,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useOptionalRealtimeContext } from "@/components/dashboard/layout/dashboard-realtime-provider";
import { EmptyState } from "@/components/admin/ui/empty-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/motion/tabs";
import type { PartnerActivityType } from "@/modules/partners/model";
import { getUserNotificationDestination, type NotificationDTO } from "../model";
import { useNotificationsContext } from "./notifications-provider";

const REALTIME_NOTIFICATION_TYPES = new Set([
  "nouvelle_commande",
  "commande_prete",
  "commande_annulee",
  "restaurant_valide",
  "restaurant_rejete",
]);

function notificationIcon(type: NotificationDTO["type"]) {
  if (type === "nouvelle_commande") return "🛒";
  if (type === "commande_prete") return "✅";
  if (type === "commande_annulee") return "❌";
  if (type === "restaurant_valide") return "🎉";
  if (type === "restaurant_rejete") return "📝";
  return "🔔";
}

function playNotificationSound() {
  try {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.frequency.value = 740;
    gain.gain.setValueAtTime(0.18, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.25);
    oscillator.addEventListener("ended", () => void context.close(), {
      once: true,
    });
    oscillator.start();
    oscillator.stop(context.currentTime + 0.25);
  } catch {
    // Le son est un enrichissement facultatif.
  }
}

function NotificationList({
  items,
  activityType,
  markAsRead,
}: {
  items: NotificationDTO[];
  activityType: PartnerActivityType;
  markAsRead: (id: string) => Promise<void>;
}) {
  if (items.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<CheckCheck className="size-7" />}
          title="Rien à signaler"
          description="Les nouvelles informations importantes apparaîtront ici."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-3" aria-live="polite">
      {items.map((notification) => {
        const destination = getUserNotificationDestination(
          activityType,
          notification,
        );
        return (
          <Card
            key={notification.id}
            className={
              notification.lue
                ? "shadow-none"
                : "bg-primary/[0.035] ring-primary/20 shadow-none"
            }
          >
            <CardHeader>
              <div className="flex items-start gap-3 pr-10">
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-base"
                  aria-hidden="true"
                >
                  {notificationIcon(notification.type)}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle>{notification.titre}</CardTitle>
                    {!notification.lue && <Badge>Nouvelle</Badge>}
                  </div>
                  <CardDescription>
                    <time dateTime={new Date(notification.createdAt).toISOString()}>
                      {new Date(notification.createdAt).toLocaleString("fr-FR", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </time>
                  </CardDescription>
                </div>
              </div>
              <CardAction>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={notification.lue}
                  onClick={() => void markAsRead(notification.id)}
                  aria-label={
                    notification.lue ? "Notification déjà lue" : "Marquer comme lue"
                  }
                >
                  <Check />
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">
                {notification.message}
              </p>
              {destination && (
                <Button asChild variant="outline" size="sm" className="mt-4">
                  <Link href={destination.href}>{destination.label}</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function NotificationCenter({
  activityType,
}: {
  activityType: PartnerActivityType;
}) {
  const {
    notifications,
    unreadCount,
    isRefreshing,
    error,
    markAsRead,
    markAllAsRead,
    refresh,
  } = useNotificationsContext();
  const [filter, setFilter] = useState("all");
  const latestEvent = useOptionalRealtimeContext()?.latestEvent ?? null;
  const knownIds = useRef(new Set(notifications.map((item) => item.id)));

  useEffect(() => {
    if (!latestEvent || !REALTIME_NOTIFICATION_TYPES.has(latestEvent.type)) return;
    const added = notifications.filter((item) => !knownIds.current.has(item.id));
    if (added.length > 0) {
      playNotificationSound();
      added.slice(0, 3).forEach((item) =>
        toast(`${notificationIcon(item.type)} ${item.titre}`, {
          description: item.message,
        }),
      );
    }
    knownIds.current = new Set(notifications.map((item) => item.id));
  }, [latestEvent, notifications]);

  const unread = useMemo(
    () => notifications.filter((item) => !item.lue),
    [notifications],
  );

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:py-10">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
            {unreadCount > 0 && (
              <Badge variant="destructive">
                {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Suivez les actions importantes et ouvrez directement leur destination.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => void refresh(false)}
            disabled={isRefreshing}
          >
            <RefreshCw className={isRefreshing ? "animate-spin" : undefined} />
            {isRefreshing ? "Actualisation…" : "Actualiser"}
          </Button>
          <Button
            type="button"
            onClick={() => void markAllAsRead()}
            disabled={unreadCount === 0}
          >
            <CheckCheck />
            Tout marquer comme lu
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <CircleAlert />
          <AlertTitle>Synchronisation interrompue</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={filter} onValueChange={setFilter} variant="segment">
        <TabsList className="bg-muted">
          <TabsTrigger value="all">Toutes ({notifications.length})</TabsTrigger>
          <TabsTrigger value="unread">Non lues ({unread.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <NotificationList
            items={notifications}
            activityType={activityType}
            markAsRead={markAsRead}
          />
        </TabsContent>
        <TabsContent value="unread">
          <NotificationList
            items={unread}
            activityType={activityType}
            markAsRead={markAsRead}
          />
        </TabsContent>
      </Tabs>
    </section>
  );
}
