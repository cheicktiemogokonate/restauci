import { Pagination } from "@/components/dashboard/pagination";
import type { Categorie, CreneauHoraire } from "@/types";
import type { PlatAvecCategorie } from "@/types/dashboard";
import { Plus, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import MenuCard from "./menu-card";
import MenuFilters from "./menu-filters";

interface MenuManagerProps {
  categories: Categorie[];
  creneaux: CreneauHoraire[];
  initialPlats: PlatAvecCategorie[];
  totalPlats: number;
  currentPage: number;
  limit: number;
  currentQ?: string;
  currentCategorie?: string;
  currentDispo?: string;
}

export default function MenuManager({
  categories,
  initialPlats,
  totalPlats,
  currentPage,
  limit,
  currentQ,
  currentCategorie,
  currentDispo,
}: MenuManagerProps) {
  return (
    <div className="flex flex-1 flex-col min-h-full overflow-hidden bg-background">
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ma carte</h1>
            <p className="text-sm text-gray-500 mt-1">
              Gérez l&apos;ensemble de vos plats
            </p>
          </div>
          <Link
            href="/restaurateur/menu/new"
            className="flex h-11 items-center gap-2 px-6 bg-brand-green hover:bg-brand-green/90 text-white rounded-xl font-semibold"
          >
            <Plus className="h-4 w-4" />
            Ajouter un plat
          </Link>
        </div>

        <MenuFilters
          categories={categories}
          totalPlats={totalPlats}
          currentQ={currentQ}
          currentCategorie={currentCategorie}
          currentDispo={currentDispo}
        />

        {initialPlats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <UtensilsCrossed className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {currentQ || currentCategorie || currentDispo !== "all"
                ? "Aucun plat trouvé"
                : "Aucun plat pour le moment"}
            </h3>
            <p className="text-sm text-gray-500 mb-6 max-w-sm">
              {currentQ || currentCategorie || currentDispo !== "all"
                ? "Essayez de modifier vos filtres ou votre recherche."
                : "Commencez par ajouter votre premier plat à la carte."}
            </p>
            {!currentQ && !currentCategorie && currentDispo === "all" && (
              <Link
                href="/restaurateur/menu/new"
                className="flex h-11 items-center gap-2 px-6 bg-brand-green hover:bg-brand-green/90 text-white rounded-xl font-semibold"
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un plat
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {initialPlats.map((plat) => (
                <MenuCard key={plat.id} plat={plat} />
              ))}
            </div>

            <Pagination total={totalPlats} page={currentPage} limit={limit} />
          </>
        )}
      </main>
    </div>
  );
}
