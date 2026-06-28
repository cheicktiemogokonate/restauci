"use client";

import { useEffect, useState } from "react";

type PermissionState = "default" | "granted" | "denied" | "unsupported";

interface UseWebPushReturn {
  permission: PermissionState;
  isSubscribed: boolean;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

export function useWebPush(): UseWebPushReturn {
  const [permission, setPermission] = useState<PermissionState>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      void Promise.resolve().then(() => setPermission("unsupported"));
      return;
    }

    void Promise.resolve().then(() => {
      setPermission(Notification.permission as PermissionState);
    });

    navigator.serviceWorker
      .register("/sw.js")
      .then(async (reg) => {
        const sub = await reg.pushManager.getSubscription();
        setIsSubscribed(!!sub);
      })
      .catch(() => setPermission("unsupported"));
  }, []);

  const subscribe = async () => {
    if (typeof window === "undefined") return;

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm as PermissionState);
      if (perm !== "granted") return;

      const reg = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        console.error("NEXT_PUBLIC_VAPID_PUBLIC_KEY manquante");
        return;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      });

      const response = await fetch("/api/push/web/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: {
            p256dh: btoa(
              String.fromCharCode(...new Uint8Array(sub.getKey("p256dh")!)),
            ),
            auth: btoa(
              String.fromCharCode(...new Uint8Array(sub.getKey("auth")!)),
            ),
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Échec de l'inscription au push");
      }

      setIsSubscribed(true);
    } catch (err) {
      console.error("[WebPush] Erreur abonnement:", err);
    }
  };

  const unsubscribe = async () => {
    if (typeof window === "undefined") return;

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) return;

      const response = await fetch("/api/push/web/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });

      if (!response.ok) {
        throw new Error("Échec de la désinscription au push");
      }

      await sub.unsubscribe();
      setIsSubscribed(false);
    } catch (err) {
      console.error("[WebPush] Erreur désinscription:", err);
    }
  };

  return { permission, isSubscribed, subscribe, unsubscribe };
}
