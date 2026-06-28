"use client";

import { useInitAuth } from "@/lib/client-app/hooks/use-init-auth";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isReady } = useInitAuth();

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-green-700 rounded-full animate-spin" />
      </div>
    );
  }

  return <div className="min-h-screen bg-gray-50">{children}</div>;
}
