"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  total: number;           // nombre total d'éléments
  page: number;            // page actuelle (1-indexed)
  limit: number;           // éléments par page
  sibling?: number;        // pages affichées de chaque côté (défaut: 1)
  onPageChange?: (page: number) => void;
}

export function Pagination({ total, page, limit, sibling = 1, onPageChange }: PaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const totalPages = Math.ceil(total / limit);

  if (totalPages <= 1) return null;

  const goToPage = (p: number) => {
    if (onPageChange) {
      onPageChange(p);
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`?${params.toString()}`);
  };

  // Calcul des pages à afficher
  const pages: (number | "...")[] = [];
  const left  = Math.max(2, page - sibling);
  const right = Math.min(totalPages - 1, page + sibling);

  pages.push(1);
  if (left > 2) pages.push("...");
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < totalPages - 1) pages.push("...");
  if (totalPages > 1) pages.push(totalPages);

  return (
    <div className="flex items-center justify-between mt-6">
      {/* Bouton précédent */}
      <Button
        type="button"
        variant="outline"
        onClick={() => goToPage(page - 1)}
        disabled={page === 1}
        className="text-muted-foreground"
      >
        ← Précédent
      </Button>

      {/* Pages */}
      <div className="flex items-center gap-1">
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`e-${i}`} className="w-8 text-center text-gray-400 text-sm">
              …
            </span>
          ) : (
            <Button
              type="button"
              key={p}
              variant={page === p ? "default" : "ghost"}
              size="icon"
              onClick={() => goToPage(p as number)}
            >
              {p}
            </Button>
          )
        )}
      </div>

      {/* Bouton suivant */}
      <Button
        type="button"
        variant="outline"
        onClick={() => goToPage(page + 1)}
        disabled={page === totalPages}
        className="text-muted-foreground"
      >
        Suivant →
      </Button>
    </div>
  );
}
