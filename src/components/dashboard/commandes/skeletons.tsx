import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton pour la grille de cartes commandes (CommandesPageClient).
 * Reprend exactement la structure d'une OrderCard : header, articles, total, boutons.
 */
export function CommandesListSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card
          key={i}
          className="overflow-hidden border border-border/60 shadow-sm rounded-2xl"
        >
          <CardContent className="p-5 space-y-4">
            {/* Date & Time */}
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-12" />
            </div>

            {/* Nom client & statut */}
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>

            {/* ID & type */}
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>

            {/* Articles */}
            <div className="space-y-3">
              <Skeleton className="h-4 w-16" />
              {Array.from({ length: 2 }).map((_, j) => (
                <div key={j} className="flex items-start gap-3">
                  <Skeleton className="h-11 w-11 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-1.5 pt-0.5">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-3 w-10" />
                  </div>
                  <Skeleton className="h-3.5 w-14" />
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="flex items-center justify-between pt-4 border-t border-border/60">
              <Skeleton className="h-4 w-10" />
              <Skeleton className="h-5 w-20" />
            </div>

            {/* Boutons */}
            <div className="flex gap-3">
              <Skeleton className="flex-1 h-10 rounded-xl" />
              <Skeleton className="flex-1 h-10 rounded-xl" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
