import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton pour la grille de cartes menu (MenuManager).
 * Reprend la structure d'une MenuCard : image 200px + titre + catégorie + prix.
 */
export function MenuGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="bg-white border border-border/60 rounded-[24px] overflow-hidden shadow-sm"
        >
          {/* Zone image */}
          <Skeleton className="h-50 w-full rounded-none" />

          {/* Contenu */}
          <div className="p-5 space-y-4">
            {/* Titre + bouton menu */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
            </div>

            {/* Rating + prix */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Skeleton className="h-4 w-4 rounded-sm" />
                <Skeleton className="h-4 w-12" />
              </div>
              <Skeleton className="h-5 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
