import { MenuGridSkeleton } from "@/components/dashboard/menu/skeletons";

/**
 * Affiché automatiquement par Next.js pendant la navigation vers /restaurateur/menu.
 */
export default function MenuLoading() {
  return (
    <div className="flex flex-1 flex-col min-h-full overflow-hidden bg-background">
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        {/* Barre de recherche simulée */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex-1 max-w-md h-10 rounded-xl bg-gray-200 animate-pulse" />
          <div className="h-11 w-28 rounded-xl bg-gray-200 animate-pulse" />
          <div className="h-11 w-36 rounded-xl bg-gray-200 animate-pulse ml-auto" />
        </div>
        <MenuGridSkeleton />
      </main>
    </div>
  );
}
