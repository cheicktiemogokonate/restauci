import { CommandesListSkeleton } from "@/components/dashboard/commandes/skeletons";

/**
 * Affiché automatiquement par Next.js pendant la navigation vers /restaurateur/commandes.
 */
export default function CommandesLoading() {
  return (
    <div className="flex flex-col min-h-full flex-1 overflow-hidden">
      <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-background mt-4">
        {/* Barre de filtres simulée */}
        <div className="flex items-center gap-2 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-9 w-24 rounded-lg bg-gray-200 animate-pulse"
            />
          ))}
        </div>
        <CommandesListSkeleton />
      </main>
    </div>
  );
}
