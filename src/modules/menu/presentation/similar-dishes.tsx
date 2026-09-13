import type { MenuDishDTO } from "@/modules/menu/contracts";
import { formatPrix } from "@/shared/format";
import Image from "next/image";
import Link from "next/link";

interface SimilarDishesProps {
  plats: MenuDishDTO[];
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
