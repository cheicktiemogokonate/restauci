"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ErrorRestaurantPage({ error }: { error: Error }) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Alert variant="destructive">
          <AlertDescription>
            Une erreur est survenue lors du chargement du menu. Veuillez réessayer.
          </AlertDescription>
        </Alert>
      </div>
    </main>
  );
}
