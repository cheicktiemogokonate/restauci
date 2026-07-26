"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { RotateCw } from "lucide-react";

export default function ErrorRestaurantPage({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <Alert variant="destructive">
          <AlertDescription>
            La page du restaurant n’a pas pu être chargée. Vérifiez votre connexion puis réessayez.
          </AlertDescription>
        </Alert>
        <Button className="mt-4 w-full" onClick={reset}><RotateCw /> Réessayer</Button>
      </div>
    </main>
  );
}
