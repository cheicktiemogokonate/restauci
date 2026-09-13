"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function ResidenceWorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[partenaire/residences]", error);
  }, [error]);

  if (process.env.NODE_ENV === "development") throw error;

  return (
    <div className="mx-auto flex min-h-[55vh] max-w-xl items-center px-4 py-10">
      <Card className="w-full shadow-sm">
        <CardContent className="p-6 sm:p-8">
          <Alert>
            <AlertTriangle />
            <AlertTitle>La gestion des résidences est indisponible</AlertTitle>
            <AlertDescription>
              Vos données ne sont pas perdues. Vérifiez votre connexion puis
              réessayez dans un instant.
            </AlertDescription>
          </Alert>
          <Button className="mt-6 w-full sm:w-auto" onClick={reset}>
            <RefreshCw /> Réessayer
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
