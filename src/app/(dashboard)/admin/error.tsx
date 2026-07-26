"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erreur de navigation dans l'administration", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6 lg:p-8">
      <div className="w-full max-w-md rounded-xl border bg-white p-8 text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-amber-50 text-amber-700">
          <AlertTriangle className="size-6" />
        </div>
        <h1 className="text-xl font-semibold text-gray-950">
          Cette vue n’a pas pu être chargée
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          La connexion aux données a été interrompue. Vous pouvez relancer le
          chargement sans quitter l’administration.
        </p>
        <Button className="mt-6" onClick={reset}>
          <RefreshCw className="size-4" />
          Réessayer
        </Button>
      </div>
    </div>
  );
}
