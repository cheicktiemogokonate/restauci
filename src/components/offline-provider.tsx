"use client";

import { OfflineScreen } from "@/components/offline-screen";
import { useOnlineStatus } from "@/hooks/use-online-status";
import React, { useEffect } from "react";

interface OfflineProviderProps {
  children: React.ReactNode;
}

export function OfflineProvider({ children }: OfflineProviderProps) {
  const { isOnline, wasOffline } = useOnlineStatus();

  useEffect(() => {
    if (isOnline && wasOffline) {
      // Déclenche un focus global pour que Next.js revalide les Server Components
      window.dispatchEvent(new Event("focus"));
    }
  }, [isOnline, wasOffline]);

  return (
    <>
      <div
        suppressHydrationWarning={true}
        className={isOnline ? "" : "pointer-events-none opacity-50"}
      >
        {children}
      </div>

      {!isOnline && <OfflineScreen wasOffline={wasOffline} />}

      {isOnline && wasOffline && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-emerald-600 text-white px-4 py-2 rounded-md shadow-md offline-toast z-9999">
          <div className="flex items-center gap-2">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden
            >
              <path
                d="M20 6L9 17l-5-5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            <span className="text-sm font-medium">Connexion rétablie</span>
          </div>
        </div>
      )}
    </>
  );
}
