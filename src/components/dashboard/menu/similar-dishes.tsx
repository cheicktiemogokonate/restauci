import type { PlatAvecCategorie } from "@/lib/db/types";
import { formatPrix } from "@/lib/utils/format";
import Image from "next/image";
import Link from "next/link";

interface SimilarDishesProps {
  plats: PlatAvecCategorie[];
}

export default function SimilarDishes({ plats }: SimilarDishesProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5">
      <h3 className="text-base font-semibold text-gray-900 mb-4">
        Plats similaires
      </h3>

      {plats.length === 0 ? (
        <p className="text-sm text-gray-400">
          Aucun autre plat dans cette catégorie.
        </p>
      ) : (
        <div className="space-y-3">
          {plats.map((plat) => (
            <Link
              key={plat.id}
              href={`/restaurateur/menu/${plat.id}`}
              className="flex items-center gap-3 group"
            >
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0 relative">
                {plat.photoUrl ? (
                  <Image
                    src={plat.photoUrl}
                    alt={plat.nom}
                    fill
                    className="object-cover"
                    sizes="56px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                    —
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate leading-tight group-hover:text-green-700 transition-colors">
                  {plat.nom}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {plat.categorie?.nom ?? "Non catégorisé"}
                </p>
                {(plat.noteMoyenne ?? 0) > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <svg
                      className="w-3 h-3 text-amber-400"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    <span className="text-xs font-semibold text-gray-600">
                      {(plat.noteMoyenne ?? 0).toFixed(1)}
                    </span>
                  </div>
                )}
              </div>
              <span className="text-sm font-bold text-gray-900 shrink-0">
                {formatPrix(plat.prix)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
