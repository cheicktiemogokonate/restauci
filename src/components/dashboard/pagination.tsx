"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface PaginationProps {
  total: number;           // nombre total d'éléments
  page: number;            // page actuelle (1-indexed)
  limit: number;           // éléments par page
  sibling?: number;        // pages affichées de chaque côté (défaut: 1)
}

export function Pagination({ total, page, limit, sibling = 1 }: PaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const totalPages = Math.ceil(total / limit);

  if (totalPages <= 1) return null;

  const goToPage = (p: number) => {
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
      <button
        onClick={() => goToPage(page - 1)}
        disabled={page === 1}
        className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        ← Précédent
      </button>

      {/* Pages */}
      <div className="flex items-center gap-1">
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`e-${i}`} className="w-8 text-center text-gray-400 text-sm">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => goToPage(p as number)}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                page === p
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {p}
            </button>
          )
        )}
      </div>

      {/* Bouton suivant */}
      <button
        onClick={() => goToPage(page + 1)}
        disabled={page === totalPages}
        className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Suivant →
      </button>
    </div>
  );
}
