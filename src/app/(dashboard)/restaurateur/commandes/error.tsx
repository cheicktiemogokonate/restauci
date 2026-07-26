"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useEffect } from "react";

interface CommandesErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function CommandesError({ error, reset }: CommandesErrorProps) {
  useEffect(() => {
    console.error("[restaurateur/commandes]", error);
  }, [error]);

  // En développement, l'overlay Next.js reste la source de diagnostic :
  // message, stack trace et code frame ne sont jamais masqués.
  if (process.env.NODE_ENV === "development") {
    throw error;
  }

  return (
    <div className="mx-auto flex min-h-[55vh] max-w-xl items-center px-4 py-10">
      <Card className="w-full shadow-sm">
        <CardContent className="p-6 sm:p-8">
          <Alert>
            <AlertTriangle />
            <AlertTitle>Les commandes sont momentanément indisponibles</AlertTitle>
            <AlertDescription>
              Vos actions ne sont pas perdues. Vérifiez votre connexion puis
              réessayez dans un instant.
            </AlertDescription>
          </Alert>

          <Button className="mt-6 w-full sm:w-auto" onClick={reset}>
            <RefreshCw />
            Réessayer
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
